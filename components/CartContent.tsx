"use client";

import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@clerk/nextjs";
import CustomerPriceGate from "@/components/CustomerPriceGate";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { ShoppingBag, Percent } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface UserDiscount {
  hasDiscounts: boolean;
  discounts: Array<{
    type: "percentage" | "free_shipping" | "fixed";
    value?: number;
    code: string;
  }>;
}

interface DiscountItem {
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
}

export default function CartContent() {
  const { state, dispatch } = useCart();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailsId = searchParams.get("detailsId");
  const [userDiscounts, setUserDiscounts] = useState<UserDiscount | null>(null);

  // Verificare discount automat pentru utilizator
  useEffect(() => {
    async function checkUserDiscount() {
      if (!user) return;

      try {
        const response = await fetch("/api/get-user-discount");
        const data = await response.json();

        if (response.ok && data.hasDiscounts) {
          setUserDiscounts(data);
        }
      } catch (error) {
        console.error(
          "Eroare la obținerea discount-urilor utilizatorului:",
          error
        );
      }
    }

    checkUserDiscount();
  }, [user]);

  const updateQuantity = (
    productId: string,
    color: string,
    quantity: number
  ) => {
    const item = state.items.find(
      (item) => item.product.id === productId && item.selectedColor === color
    );
    if (!item) return;

    dispatch({
      type: "UPDATE_QUANTITY",
      payload: { productId, color, quantity },
    });
  };

  const removeItem = (productId: string, color: string) => {
    dispatch({
      type: "REMOVE_FROM_CART",
      payload: { productId, color },
    });
    toast({
      title: "Item removed",
      description: "The item has been removed from your cart.",
    });
  };

  const handleProceedToOrderDetails = () => {
    router.push("/order-details");
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to checkout.",
        variant: "destructive",
      });
      return;
    }

    if (!detailsId) {
      router.push("/order-details");
      return;
    }

    try {
      // Verificăm dacă există discounturi automate și le includem în request
      let appliedDiscounts: DiscountItem[] = [];
      if (userDiscounts && userDiscounts.hasDiscounts) {
        appliedDiscounts = userDiscounts.discounts.map((discount) => ({
          code: discount.code,
          type: discount.type,
          value:
            discount.type === "percentage" || discount.type === "fixed"
              ? discount.value || 0
              : 0,
        }));
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: state.items,
          userId: user.id,
          detailsId: detailsId,
          appliedDiscounts: appliedDiscounts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error("Failed to load Stripe");
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error("Error in handleCheckout:", error);
      toast({
        title: "Checkout Error",
        description:
          error.message ||
          "An error occurred during checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const storeNotLiveMessage = (
    <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
      <h2 className="text-lg font-semibold text-amber-900 mb-2">
        Magazinul online nu este încă activ
      </h2>
      <p className="text-amber-800">
        Poți explora produsele; magazinul online nu este încă live și comenzile nu pot fi finalizate. Te anunțăm când vom activa vânzările online.
      </p>
    </div>
  );

  if (state.items.length === 0) {
    return (
      <div className="container mx-auto px-6 py-12">
        {storeNotLiveMessage}
        <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
          <div className="text-center space-y-6">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
            <h1 className="text-3xl font-bold">Coșul tău este gol</h1>
            <p className="text-gray-600">
              Poți explora produsele; butonul de cumpărare va fi activ când magazinul va fi lansat.
            </p>
            <Link href="/">
              <Button size="lg" className="mt-6">
                Înapoi la magazin
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      {storeNotLiveMessage}
      <h1 className="text-3xl font-bold mb-8">Coș de cumpărături</h1>

      {userDiscounts && userDiscounts.hasDiscounts && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg">
          <div className="flex items-center">
            <Percent className="h-5 w-5 text-green-600 mr-2" />
            <div className="font-medium text-green-700">
              {userDiscounts.discounts.length === 1 ? (
                <span>
                  Administratorul v-a aplicat un cod de reducere automat de:{" "}
                  {userDiscounts.discounts[0].type === "percentage"
                    ? `${userDiscounts.discounts[0].value}% la întreaga comandă`
                    : userDiscounts.discounts[0].type === "fixed"
                    ? `${userDiscounts.discounts[0].value} RON`
                    : "transport gratuit"}
                </span>
              ) : (
                <span>
                  Administratorul v-a aplicat {userDiscounts.discounts.length}{" "}
                  coduri de reducere automate
                </span>
              )}
            </div>
          </div>
          {userDiscounts.discounts.length > 1 && (
            <ul className="mt-2 ml-7 text-sm text-green-700">
              {userDiscounts.discounts.map((discount, index) => (
                <li key={discount.code}>
                  {discount.type === "percentage"
                    ? `${discount.value}% la întreaga comandă`
                    : discount.type === "fixed"
                    ? `${discount.value} RON reducere fixă`
                    : "transport gratuit"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-8">
        {state.items.map((item) => (
          <div
            key={`${item.product.id}-${item.selectedColor}`}
            className="flex items-center justify-between border-b pb-4"
          >
            <div className="flex items-center space-x-4">
              <div className="relative w-24 h-24 flex-shrink-0">
                <Image
                  src={item.product.images[0] || "/placeholder.svg"}
                  alt={item.product.name}
                  fill
                  className="object-cover rounded-md"
                />
              </div>
              <div>
                <h3 className="font-semibold">{item.product.name}</h3>
                <p className="text-sm text-gray-600">
                  Color: {item.selectedColor}
                </p>
                <CustomerPriceGate>
                  <p className="text-sm font-medium">
                    {item.variant.price.toFixed(2)} lei
                  </p>
                </CustomerPriceGate>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    updateQuantity(
                      item.product.id,
                      item.selectedColor,
                      Math.max(0, item.quantity - 1)
                    )
                  }
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newQuantity = parseInt(e.target.value) || 0;
                    updateQuantity(
                      item.product.id,
                      item.selectedColor,
                      Math.max(0, newQuantity)
                    );
                  }}
                  className="w-16 text-center"
                  min="0"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    updateQuantity(
                      item.product.id,
                      item.selectedColor,
                      item.quantity + 1
                    )
                  }
                >
                  +
                </Button>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeItem(item.product.id, item.selectedColor)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}

        <div className="pt-4">
          <div className="flex justify-between items-center text-xl font-bold gap-4">
            <span>Total:</span>
            <CustomerPriceGate>
              <span>{state.total.toFixed(2)} lei</span>
            </CustomerPriceGate>
          </div>
          <Button
            className="w-full mt-8"
            disabled
            title="Magazinul online nu este încă activ"
          >
            Finalizare comandă (în curând)
          </Button>
        </div>
      </div>
    </div>
  );
}
