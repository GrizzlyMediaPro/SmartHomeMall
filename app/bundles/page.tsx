"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useEffect, useState } from "react";
import { ColorVariant } from "@/lib/types";
import CustomerPriceGate from "@/components/CustomerPriceGate";

interface BundleItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    images: string[];
  };
}

interface Bundle {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  images: string[];
  stock: number;
  discount: number | null;
  allowOutOfStock: boolean;
  items: BundleItem[];
  createdAt: Date;
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const { dispatch } = useCart();

  useEffect(() => {
    async function loadBundles() {
      try {
        const response = await fetch("/api/bundles");
        if (!response.ok) {
          throw new Error("Failed to fetch bundles");
        }
        const data = await response.json();
        setBundles(data);
      } catch (error) {
        console.error("Failed to fetch bundles:", error);
        setBundles([]);
      } finally {
        setLoading(false);
      }
    }

    loadBundles();
  }, []);

  const handleAddToCart = (bundle: Bundle, e: React.MouseEvent) => {
    e.preventDefault();

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

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Pachete Smart Home</h1>
        <div className="text-center py-12">
          <p>Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (bundles.length === 0) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Pachete Smart Home</h1>
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">
            Nu există pachete disponibile momentan. Vă rugăm reveniți mai
            târziu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Pachete Smart Home</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bundles.map((bundle) => {
          const discountPercentage = bundle.oldPrice
            ? Math.round(
                ((bundle.oldPrice - bundle.price) / bundle.oldPrice) * 100
              )
            : 0;

          return (
            <div
              key={bundle.id}
              className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <Link href={`/bundles/${bundle.id}`}>
                <div className="aspect-video relative">
                  <Image
                    src={bundle.images[0] || "/placeholder.svg"}
                    alt={bundle.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {bundle.oldPrice && discountPercentage > 0 && (
                    <Badge className="absolute top-2 right-2 bg-red-600">
                      -{discountPercentage}%
                    </Badge>
                  )}
                </div>
              </Link>

              <div className="p-4">
                <Link href={`/bundles/${bundle.id}`}>
                  <h2 className="text-xl font-semibold mb-2 hover:text-primary transition-colors">
                    {bundle.name}
                  </h2>
                </Link>

                <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                  {bundle.description}
                </p>

                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-col min-w-0 flex-1 mr-2">
                    <CustomerPriceGate>
                      <>
                        <span className="text-lg font-bold text-primary">
                          {bundle.price.toFixed(2)} RON
                        </span>
                        {bundle.oldPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            {bundle.oldPrice.toFixed(2)} RON
                          </span>
                        )}
                      </>
                    </CustomerPriceGate>
                  </div>

                  <Badge variant="outline" className="text-xs">
                    {bundle.items.length} produse
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {/* Eliminat statusul de stoc */}
                  </span>

                  <Button
                    size="sm"
                    onClick={(e) => handleAddToCart(bundle, e)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Adaugă
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
