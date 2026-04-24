"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Carousel from "@/components/Carousel";
import { ProductWithVariants, ColorVariant } from "@/lib/types";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import CustomerPriceGate from "@/components/CustomerPriceGate";

interface ProductDetailsProps {
  product: ProductWithVariants;
  initialColor?: string;
}

export default function ProductDetails({
  product,
  initialColor,
}: ProductDetailsProps) {
  const [selectedColor, setSelectedColor] = useState<string>(
    initialColor ||
      (product.colorVariants && product.colorVariants.length > 0
        ? product.colorVariants[0].color
        : "")
  );
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    // Magazinul online nu este încă activ — fără funcționalitate momentan
  };

  const incrementQuantity = () => {
    setQuantity((prev) => Math.min(prev + 1, 10));
  };

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  const images =
    product.images && product.images.length > 0
      ? product.images
      : ["/placeholder.svg?height=500&width=500"];

  const selectedVariant = product.colorVariants.find(
    (v) => v.color === selectedColor
  );

  return (
    <div className="max-w-[1250px] mx-auto w-full px-4 md:px-6">
      <div className="flex flex-col md:flex-row gap-8 bg-white rounded-3xl overflow-hidden shadow-lg">
        {/* Secțiunea cu imaginea - fundal întunecat */}
        <div className="w-full md:w-1/2 bg-[#1a1a1a] relative min-h-[200px] md:min-h-[600px] flex items-center justify-center">
          <div className="w-[280px] h-[160px] md:w-full md:h-full relative">
            <Carousel images={images} />
          </div>
        </div>

        {/* Secțiunea cu detaliile produsului */}
        <div className="w-full md:w-1/2 p-4 md:p-8 pt-6 md:pt-12 flex flex-col justify-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">
            {product.name}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-8">
            {product.description}
          </p>

          {product.pdfUrl && (
            <div className="mb-4 md:mb-8">
              <a
                href={product.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Descarcă instrucțiuni PDF</span>
              </a>
            </div>
          )}

          {/* Culori disponibile */}
          <div className="mb-4 md:mb-8">
            <h3 className="text-xs md:text-sm font-medium mb-2 md:mb-3">
              CULOARE
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.colorVariants.map((variant) => (
                <button
                  key={variant.color}
                  onClick={() => setSelectedColor(variant.color)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base rounded-lg border ${
                    selectedColor === variant.color
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-gray-200 hover:border-black"
                  }`}
                >
                  {variant.color}
                </button>
              ))}
            </div>
          </div>

          {/* Prețul și reducerea */}
          <div className="mb-4 md:mb-8">
            {selectedVariant && (
              <CustomerPriceGate className="block max-w-md">
                <>
                  {selectedVariant.oldPrice &&
                  selectedVariant.oldPrice > selectedVariant.price ? (
                    <>
                      <p className="text-2xl md:text-3xl font-bold text-red-600">
                        {selectedVariant.price.toFixed(2)} lei
                      </p>
                      <p className="text-base md:text-lg text-gray-500 line-through">
                        {selectedVariant.oldPrice.toFixed(2)} lei
                      </p>
                      <p className="text-base md:text-lg text-green-600">
                        Economisești{" "}
                        {(
                          selectedVariant.oldPrice - selectedVariant.price
                        ).toFixed(2)}{" "}
                        lei (
                        {Math.round(
                          (1 -
                            selectedVariant.price /
                              selectedVariant.oldPrice) *
                            100
                        )}
                        %)
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl md:text-3xl font-bold">
                      {selectedVariant.price.toFixed(2)} lei
                    </p>
                  )}
                </>
              </CustomerPriceGate>
            )}
          </div>

          {/* Contor și buton adăugare în coș */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 rounded-2xl">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-12 w-12 hover:bg-gray-200 rounded-l-2xl"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="w-12 text-center font-medium">{quantity}</div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-12 w-12 hover:bg-gray-200 rounded-r-2xl"
                onClick={incrementQuantity}
                disabled={quantity >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled
              title="Magazinul online nu este încă activ"
              className="flex-1 bg-gray-300 text-gray-600 cursor-not-allowed text-base md:text-lg py-4 md:py-6 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
              <span>Cumpără (în curând)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
