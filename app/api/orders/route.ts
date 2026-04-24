import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth'

interface OrderDetails {
  id: string;
  userId?: string | null;
  email: string;
  fullName: string;
  phoneNumber: string;
  street: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
  notes: string | null;
  isCompany: boolean;
  companyName: string | null;
  companyCUI: string | null;
  companyRegNumber: string | null;
  companyCounty: string | null;
  companyCity: string | null;
  companyAddress: string | null;
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  size?: string;
  price: number;
  product: {
    id: string;
    name: string;
    images: string[];
  };
}

interface BundleOrder {
  id: string;
  bundleId: string;
  quantity: number;
  price: number;
  bundle: {
    name: string;
    images: string[];
  };
}

interface DiscountCodeDetails {
  id: string;
  code: string;
  type: string;
  value: number;
  usesLeft: number | null;
  totalUses: number;
  expirationDate: Date | null;
  canCumulate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderDiscountCode {
  discountCode: DiscountCodeDetails;
}

interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  createdAt: Date;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  orderType: string;
  paymentType: string;
  courier?: string | null;
  awb?: string | null;
  items: OrderItem[];
  BundleOrder: BundleOrder[];
  discountCodes: OrderDiscountCode[];
  details: OrderDetails;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId')
    const { userId: currentUserId } = await auth()

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminStatus = await isAdmin()
    const targetUserId = adminStatus && requestedUserId ? requestedUserId : currentUserId

    const orders = await prisma.order.findMany({
      where: { userId: targetUserId },
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
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedOrders = orders.map((order: Order) => ({
      id: order.id,
      createdAt: order.createdAt.toISOString(),
      total: order.total,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      orderType: order.orderType,
      items: order.items.map((item: OrderItem) => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        color: item.size ?? 'N/A',
        price: item.price,
        image: item.product.images[0] || '/placeholder.svg'
      })),
      bundleOrders: order.BundleOrder.map((bundleOrder: BundleOrder) => ({
        id: bundleOrder.id,
        bundleId: bundleOrder.bundleId,
        quantity: bundleOrder.quantity,
        price: bundleOrder.price,
        bundle: bundleOrder.bundle 
          ? {
              name: bundleOrder.bundle.name,
              images: bundleOrder.bundle.images || [],
            }
          : {
              name: 'Pachet indisponibil',
              images: [],
            }
      })),
      details: {
        fullName: order.details.fullName,
        email: order.details.email,
        phoneNumber: order.details.phoneNumber,
        street: order.details.street,
        city: order.details.city,
        county: order.details.county,
        postalCode: order.details.postalCode,
        country: order.details.country,
        notes: order.details.notes,
        isCompany: order.details.isCompany,
        companyName: order.details.companyName,
        companyCUI: order.details.companyCUI,
        companyRegNumber: order.details.companyRegNumber,
        companyCounty: order.details.companyCounty,
        companyCity: order.details.companyCity,
        companyAddress: order.details.companyAddress,
      },
      paymentType: order.paymentType,
      courier: order.courier,
      awb: order.awb,
      discountCodes: order.discountCodes.map((dc: OrderDiscountCode) => ({
        code: dc.discountCode.code,
        type: dc.discountCode.type,
        value: dc.discountCode.value
      }))
    }))

    return NextResponse.json(formattedOrders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

