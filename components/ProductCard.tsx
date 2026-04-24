"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductWithVariants, ColorVariant } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import CustomerPriceGate from "@/components/CustomerPriceGate";

export default function ProductCard({
  product,
}: {
  product: ProductWithVariants;
}) {
  const variantsContainerRef = useRef<HTMLDivElement>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const getInitialVariant = () => {
    if (!product.colorVariants || product.colorVariants.length === 0)
      return null;
    return product.colorVariants[0];
  };

  const [selectedVariant, setSelectedVariant] = useState<ColorVariant | null>(
    getInitialVariant()
  );

  const checkScroll = () => {
    if (variantsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        variantsContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      setShowNavigation(scrollWidth > clientWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (variantsContainerRef.current) {
      const scrollAmount = 100;
      variantsContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 100);
    }
  };

  const isBestSeller = product.tags?.includes("bestseller");
  const isOnSale =
    selectedVariant?.oldPrice &&
    selectedVariant.oldPrice > selectedVariant.price;

  const productUrl = `/products/${product.id}${
    selectedVariant ? `?color=${selectedVariant.color}` : ""
  }`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    // Magazinul online nu este încă activ — fără funcționalitate momentan
  };

  return (
    <Link href={productUrl} className="block h-full">
      <div className="relative h-full bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col">
        {/* Best Seller Badge */}
        {isBestSeller && (
          <div className="absolute top-3 left-3 z-10">
            <div className="bg-[#29b4b9] text-black px-3 py-0.5 rounded-full text-xs font-medium">
              BestSeller
            </div>
          </div>
        )}

        {/* Image Container */}
        <div className="relative aspect-square w-full bg-[#1a1a1a] overflow-hidden flex-shrink-0">
          <Image
            src={product.images[0] || `/api/placeholder?width=250&height=250`}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-opacity duration-300"
          />
          {/* Description Overlay */}
          <div className="absolute inset-0 p-4 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" />
            <p className="text-white text-center text-sm leading-relaxed relative z-10 line-clamp-6">
              {product.description || "Fără descriere disponibilă"}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-grow p-4">
          <h3 className="text-lg font-semibold mb-2 line-clamp-2">
            {product.name}
          </h3>

          {/* Color Variants */}
          <div className="relative flex-grow">
            <div
              ref={variantsContainerRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
              onScroll={checkScroll}
            >
              {product.colorVariants?.map((variant) => (
                <button
                  key={variant.color}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedVariant(variant);
                  }}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedVariant?.color === variant.color
                      ? "bg-[#29b4b9] text-black"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {variant.color}
                </button>
              ))}
            </div>

            {showNavigation && (
              <>
                {canScrollLeft && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      scroll("left");
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-0.5 shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {canScrollRight && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      scroll("right");
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-0.5 shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Price and Add to Cart */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex flex-wrap items-baseline gap-1 min-w-0 flex-1 mr-2">
              <CustomerPriceGate>
                <>
                  <p
                    className={`text-xl font-bold ${
                      isOnSale ? "text-red-600" : ""
                    }`}
                  >
                    {selectedVariant?.price.toFixed(2)} lei
                  </p>
                  {isOnSale && (
                    <p className="text-xs text-gray-500 line-through">
                      {selectedVariant?.oldPrice?.toFixed(2)} lei
                    </p>
                  )}
                </>
              </CustomerPriceGate>
            </div>

            <button
              onClick={handleAddToCart}
              disabled
              title="Magazinul online nu este încă activ"
              className="bg-gray-300 text-gray-500 p-2.5 rounded-xl cursor-not-allowed transition-colors duration-300"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
