import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { rememberDetails, paymentType, ...orderDetails } = body
    const { userId: currentUserId } = await auth()

    // Never trust userId from payload; bind data to authenticated user when present.
    const payloadUserId = orderDetails.userId as string | null | undefined
    if (currentUserId && payloadUserId && payloadUserId !== currentUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const safeUserId = currentUserId ?? null

    const savedDetails = await prisma.orderDetails.create({
      data: {
        userId: safeUserId,
        fullName: orderDetails.fullName,
        email: orderDetails.email,
        phoneNumber: orderDetails.phoneNumber,
        street: orderDetails.street,
        city: orderDetails.city,
        county: orderDetails.county,
        postalCode: orderDetails.postalCode,
        country: orderDetails.country,
        notes: orderDetails.notes || '',
        isCompany: orderDetails.isCompany || false,
        companyName: orderDetails.companyName,
        companyCUI: orderDetails.companyCUI,
        companyRegNumber: orderDetails.companyRegNumber,
        companyCounty: orderDetails.companyCounty,
        companyCity: orderDetails.companyCity,
        companyAddress: orderDetails.companyAddress,
      },
    })

    return NextResponse.json({ id: savedDetails.id })
  } catch (error) {
    console.error('Error saving order details:', error)
    return NextResponse.json({ error: 'Failed to save order details' }, { status: 500 })
  }
}

