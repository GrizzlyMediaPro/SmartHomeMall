"use client";

import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ColorVariant } from "@/lib/types";
import CustomerPriceGate from "@/components/CustomerPriceGate";

interface BundlePageProps {
  params: {
    id: string;
  };
}

export default function BundlePage({ params }: BundlePageProps) {
  const [bundle, setBundle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { dispatch } = useCart();

  useEffect(() => {
    async function loadBundle() {
      try {
        const response = await fetch(`/api/bundles/${params.id}`);
        if (!response.ok) {
          notFound();
        }
        const data = await response.json();
        setBundle(data);
      } catch (error) {
        console.error("Error loading bundle:", error);
        notFound();
      } finally {
        setLoading(false);
      }
    }

    loadBundle();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-10">
        <div className="text-center">Se încarcă...</div>
      </div>
    );
  }

  if (!bundle) {
    return notFound();
  }

  const discountPercentage = bundle.oldPrice
    ? Math.round(((bundle.oldPrice - bundle.price) / bundle.oldPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    // Create a dummy color variant for the bundle
    const bundleVariant: ColorVariant = {
      id: `bundle-${bundle.id}-standard`,
      color: "standard",
      price: bundle.price,
      oldPrice: bundle.oldPrice,
      productId: `bundle-${bundle.id}`,
      productCode: `BUNDLE-${bundle.id}`,
    };

    // Add to cart using dispatch
    dispatch({
      type: "ADD_TO_CART",
      payload: {
        product: {
          id: `bundle-${bundle.id}`,
          name: bundle.name,
          description: bundle.description,
          images: bundle.images,
          category: "Bundle",
          subcategory: null,
          price: bundle.price,
          oldPrice: bundle.oldPrice,
          createdAt: new Date(),
          updatedAt: new Date(),
          colorVariants: [bundleVariant],
        },
        color: "standard",
        variant: bundleVariant,
        quantity: 1,
      },
    });

    // Show success toast
    toast({
      title: "Pachet adăugat în coș",
      description: `${bundle.name} a fost adăugat în coșul tău.`,
      action: (
        <ToastAction altText="Vezi coșul" asChild>
          <Link
            href="/cart"
            className="bg-[#29b4b9] hover:bg-[#4adde4] text-black transition-colors"
          >
            Vezi coșul
          </Link>
        </ToastAction>
      ),
    });
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Secțiunea cu imagini */}
        <div className="space-y-4">
          <div className="aspect-square relative border rounded-lg overflow-hidden">
            <Image
              src={bundle.images[0] || "/placeholder.svg"}
              alt={bundle.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            {bundle.oldPrice && discountPercentage > 0 && (
              <Badge className="absolute top-4 right-4 bg-red-600">
                -{discountPercentage}%
              </Badge>
            )}
          </div>

          {bundle.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {bundle.images.slice(1).map((image: string, index: number) => (
                <div
                  key={index}
                  className="aspect-square relative border rounded-lg overflow-hidden"
                >
                  <Image
                    src={image}
                    alt={`${bundle.name} ${index + 2}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 25vw, 12vw"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Secțiunea cu informații */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{bundle.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="flex flex-wrap items-baseline gap-2 min-w-0">
                <CustomerPriceGate>
                  <>
                    <span className="text-2xl font-bold">
                      {bundle.price.toFixed(2)} RON
                    </span>
                    {bundle.oldPrice && (
                      <span className="text-gray-500 line-through">
                        {bundle.oldPrice.toFixed(2)} RON
                      </span>
                    )}
                  </>
                </CustomerPriceGate>
              </div>
              {bundle.oldPrice && discountPercentage > 0 && (
                <CustomerPriceGate>
                  <Badge
                    variant="outline"
                    className="text-red-600 border-red-600"
                  >
                    Economisești {(bundle.oldPrice - bundle.price).toFixed(2)}{" "}
                    RON
                  </Badge>
                </CustomerPriceGate>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Descriere</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {bundle.description}
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Produse incluse ({bundle.items.length})
            </h2>
            <div className="space-y-3">
              {bundle.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="w-16 h-16 relative rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={item.product.images[0] || "/placeholder.svg"}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">
                      {item.product.name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {item.quantity} {item.quantity > 1 ? "bucăți" : "bucată"}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-right max-w-[140px]">
                    <CustomerPriceGate>
                      <span>{item.product.price.toFixed(2)} RON</span>
                    </CustomerPriceGate>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Button
              className="w-full py-6 text-lg"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Adaugă în coș
            </Button>

            {/* Eliminat statusul de stoc */}
          </div>
        </div>
      </div>
    </div>
  );
}
