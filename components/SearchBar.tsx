"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import CustomerPriceGate from "@/components/CustomerPriceGate";

interface SearchBarProps {
  className?: string;
  transparent?: boolean;
}

export default function SearchBar({ className, transparent }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/products/search?term=${encodeURIComponent(searchTerm)}`
      );
      if (!response.ok) throw new Error("Failed to fetch search results");
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching products:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = (productId: string) => {
    setSearchResults([]);
    setSearchTerm("");
    router.push(`/products/${productId}`);
  };

  return (
    <div className={`relative search-dropdown ${className || ''}`} ref={searchRef}>
      <div className="flex items-center relative w-full">
        <Input
          type="text"
          placeholder={t("search.placeholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={
            `w-full pr-8 rounded-full ` +
            (transparent
              ? "bg-transparent border border-white text-white placeholder-white focus:border-white focus:ring-0 focus-visible:ring-0 focus-visible:border-white"
              : "bg-transparent border border-gray-300 text-black placeholder:text-black/70 focus:border-blue-400 focus:ring-0 focus-visible:ring-0") +
            (className ? ` ${className}` : "")
          }
        />
        <Search
          className={
            `h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 ` +
            (transparent ? "text-white" : "text-black/70")
          }
        />
      </div>
      {isLoading && (
        <div className="absolute z-10 mt-2 w-full bg-white shadow-lg rounded-md p-2 text-center">
          Loading...
        </div>
      )}
      {!isLoading && searchResults.length > 0 && (
        <div className="absolute z-10 mt-2 w-full bg-white shadow-lg rounded-md overflow-hidden">
          {searchResults.map((product) => (
            <div
              key={product.id}
              onClick={() => handleProductClick(product.id)}
              className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
            >
              <Image
                src={product.images[0] || "/placeholder.svg"}
                alt={product.name}
                width={40}
                height={40}
                className="rounded-md object-cover"
              />
              <div className="ml-2">
                <p className="font-semibold">{product.name}</p>
                <CustomerPriceGate className="block mt-0.5">
                  <p className="text-sm text-gray-600">
                    {product.price.toFixed(2)} lei
                  </p>
                </CustomerPriceGate>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
