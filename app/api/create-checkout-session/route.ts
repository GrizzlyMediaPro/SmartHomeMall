import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

interface Product {
  id: string;
  name: string;
}

interface Bundle {
  id: string;
  name: string;
}

interface Variant {
  price: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
  variant: Variant;
}

interface Discount {
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
}

interface CheckoutRequestBody {
  items: CartItem[];
  userId: string | null;
  detailsId: string;
  paymentType: string;
  appliedDiscounts?: Discount[];
}

export async function POST(req: Request) {
  try {
    const { userId: currentUserId } = await auth();
    const body = await req.json() as CheckoutRequestBody;
    const { items, userId, detailsId, paymentType, appliedDiscounts = [] } = body;

    if (currentUserId && userId && userId !== currentUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const safeUserId = currentUserId ?? null;

    if (!items?.length) {
      return NextResponse.json({ error: 'Nu există produse în coș' }, { status: 400 });
    }

    if (!detailsId) {
      return NextResponse.json({ error: 'Detaliile comenzii sunt obligatorii' }, { status: 400 });
    }

    // Verifică dacă detaliile comenzii există și dacă email-ul este valid
    const orderDetails = await prisma.orderDetails.findUnique({
      where: { id: detailsId },
      select: {
        email: true,
        id: true,
        userId: true,
      }
    });

    if (!orderDetails) {
      return NextResponse.json({ error: 'Detaliile comenzii nu au fost găsite' }, { status: 400 });
    }

    if (orderDetails.userId !== safeUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validare email simplă
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderDetails.email)) {
      return NextResponse.json({ error: 'Adresa de email nu este validă' }, { status: 400 });
    }

    // Calculate total with discounts
    const subtotal = items.reduce((acc, item) => 
      acc + (item.variant.price * item.quantity), 0
    );
    const shipping = 15; // Fixed shipping cost
    const discountAmount = appliedDiscounts.reduce((acc, discount) => {
      switch (discount.type) {
        case 'percentage':
          return acc + (subtotal * discount.value / 100);
        case 'fixed':
          return acc + discount.value;
        case 'free_shipping':
          return acc + shipping;
        default:
          return acc;
      }
    }, 0);

    const total = Math.max(0, subtotal + shipping - discountAmount);
    const totalInCents = Math.round(total * 100);

    // Separate regular products and bundles
    const { regularItems, bundleItems } = items.reduce<{
      regularItems: CartItem[];
      bundleItems: CartItem[];
    }>(
      (acc, item) => {
        const isBundle = item.product.id.startsWith('bundle-');
        if (isBundle) {
          acc.bundleItems.push(item);
        } else {
          acc.regularItems.push(item);
        }
        return acc;
      },
      { regularItems: [], bundleItems: [] }
    );

    // Verifică dacă toate produsele normale există în baza de date
    if (regularItems.length > 0) {
      const productIds = regularItems.map(item => item.product.id);
      
      const existingProducts = await prisma.product.findMany({
        where: {
          id: { in: productIds }
        },
        select: { id: true }
      });

      if (existingProducts.length !== productIds.length) {
        const foundIds = new Set(existingProducts.map((p: { id: string }) => p.id));
        const missingIds = productIds.filter(id => !foundIds.has(id));
        return NextResponse.json({ 
          error: `Unul sau mai multe produse nu mai există în stoc: ${missingIds.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Verifică dacă toate pachetele există în baza de date
    if (bundleItems.length > 0) {
      const bundleIds = bundleItems.map(item => item.product.id.replace('bundle-', ''));
      
      const existingBundles = await prisma.bundle.findMany({
        where: {
          id: { in: bundleIds }
        },
        select: { id: true }
      });

      if (existingBundles.length !== bundleIds.length) {
        const foundIds = new Set(existingBundles.map((b: { id: string }) => b.id));
        const missingIds = bundleIds.filter(id => !foundIds.has(id));
        return NextResponse.json({ 
          error: `Unul sau mai multe pachete nu mai există în stoc: ${missingIds.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Create Stripe checkout session with single line item for total
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ron',
            product_data: {
              name: 'Order Total',
              description: `${items.length} item${items.length > 1 ? 's' : ''} with shipping${appliedDiscounts.length > 0 ? ' and discounts' : ''}`,
            },
            unit_amount: totalInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
      customer_email: orderDetails.email,
      metadata: {
        // Bind session metadata to authenticated identity.
        userId: safeUserId || '',
        detailsId,
        orderType: bundleItems.length > 0 && regularItems.length === 0 ? 'bundle' : 'product',
        regularItems: JSON.stringify(regularItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          color: item.selectedColor,
          price: item.variant.price
        }))),
        bundleItems: JSON.stringify(bundleItems.map(item => ({
          bundleId: item.product.id.replace('bundle-', ''),
          quantity: item.quantity,
          price: item.variant.price
        }))),
        appliedDiscounts: JSON.stringify(appliedDiscounts),
        email: orderDetails.email,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err: any) {
    console.error('Error in create-checkout-session:', err);
    return NextResponse.json(
      { error: err.message || 'A apărut o eroare în timpul procesării plății' },
      { status: err.statusCode || 500 }
    );
  }
}

