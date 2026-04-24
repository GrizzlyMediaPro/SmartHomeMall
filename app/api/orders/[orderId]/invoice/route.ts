import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoicePDF } from '@/lib/pdf';
import { auth } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        BundleOrder: {
          include: {
            bundle: true
          }
        },
        details: true,
        discountCodes: {
          include: {
            discountCode: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const adminStatus = await isAdmin();
    if (!adminStatus && order.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pdfBuffer = await generateInvoicePDF(order);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${order.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
} 