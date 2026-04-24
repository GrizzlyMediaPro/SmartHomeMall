"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/cart-context";
import { loadStripe } from "@stripe/stripe-js";
import { X } from "lucide-react";
import type { UserDiscount } from "@/lib/types";
import CustomerPriceGate from "@/components/CustomerPriceGate";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const formSchema = z
  .object({
    // Date personale
    fullName: z.string().min(2, "Numele trebuie să aibă cel puțin 2 caractere"),
    email: z.string().email("Adresa de email nu este validă"),
    phoneNumber: z
      .string()
      .min(10, "Numărul de telefon trebuie să aibă cel puțin 10 caractere"),
    street: z.string().min(5, "Adresa trebuie să aibă cel puțin 5 caractere"),
    city: z.string().min(2, "Orașul trebuie să aibă cel puțin 2 caractere"),
    county: z.string().min(2, "Județul trebuie să aibă cel puțin 2 caractere"),
    postalCode: z
      .string()
      .min(6, "Codul poștal trebuie să aibă cel puțin 6 caractere"),
    country: z.string().min(2, "Țara trebuie să aibă cel puțin 2 caractere"),
    notes: z.string().optional(),
    isCompany: z.boolean().default(false),
    companyName: z.string().optional(),
    companyCUI: z.string().optional(),
    companyRegNumber: z.string().optional(),
    companyCounty: z.string().optional(),
    companyCity: z.string().optional(),
    companyAddress: z.string().optional(),

    // Metoda plata
    paymentType: z.enum(["card", "ramburs"]),

    // Remember details
    rememberDetails: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.isCompany) {
        return (
          !!data.companyName &&
          !!data.companyCUI &&
          !!data.companyRegNumber &&
          !!data.companyCounty &&
          !!data.companyCity &&
          !!data.companyAddress
        );
      }
      return true;
    },
    {
      message: "Toate câmpurile pentru persoană juridică sunt obligatorii",
      path: ["companyName"],
    }
  );

export default function OrderDetailsForm({ userId }: { userId?: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { state, dispatch } = useCart();
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscounts, setAppliedDiscounts] = useState<
    {
      code: string;
      value: number;
      type: "percentage" | "fixed" | "free_shipping";
    }[]
  >([]);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [savedDetails, setSavedDetails] = useState<any>(null);
  const [userDiscounts, setUserDiscounts] = useState<UserDiscount[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      street: "",
      city: "",
      county: "",
      postalCode: "",
      country: "România",
      notes: "",
      isCompany: false,
      companyName: "",
      companyCUI: "",
      companyRegNumber: "",
      companyCounty: "",
      companyCity: "",
      companyAddress: "",
      paymentType: "card",
      rememberDetails: false,
    },
  });

  useEffect(() => {
    if (userId) {
      const savedDetails = localStorage.getItem(`userDetails_${userId}`);
      if (savedDetails) {
        const parsedDetails = JSON.parse(savedDetails);
        form.reset(parsedDetails);
      }
    }
  }, [userId, form]);

  // Verificare discount automat pentru utilizator
  useEffect(() => {
    async function checkUserDiscount() {
      if (!userId) return;

      try {
        const response = await fetch("/api/get-user-discount");
        const data = await response.json();

        if (response.ok && data.hasDiscounts) {
          // Verificăm dacă nu avem deja discounturi aplicate
          if (appliedDiscounts.length === 0) {
            // Adăugăm toate discounturile utilizatorului
            const userDiscounts = data.discounts.map((discount: UserDiscount) => ({
              code: discount.code,
              value:
                discount.type === "percentage" || discount.type === "fixed"
                  ? discount.value
                  : 0,
              type: discount.type as "percentage" | "fixed" | "free_shipping",
            }));

            setAppliedDiscounts(userDiscounts);

            if (userDiscounts.length === 1) {
              const discount = userDiscounts[0];
              toast({
                title: "Discount aplicat",
                description:
                  discount.type === "percentage"
                    ? `Administratorul v-a aplicat un cod de reducere automat de ${discount.value}% la întreaga comandă`
                    : discount.type === "fixed"
                    ? `Administratorul v-a aplicat un cod de reducere automat de ${discount.value} RON`
                    : "Administratorul v-a aplicat un cod de reducere pentru transport gratuit",
                variant: "default",
              });
            } else if (userDiscounts.length > 1) {
              toast({
                title: "Discounturi aplicate",
                description: `Administratorul v-a aplicat ${userDiscounts.length} coduri de reducere automate`,
                variant: "default",
              });
            }
          }
        }
      } catch (error) {
        console.error(
          "Eroare la obținerea discount-ului utilizatorului:",
          error
        );
      }
    }

    checkUserDiscount();
  }, [userId, appliedDiscounts.length]);

  async function handleApplyDiscount() {
    try {
      const response = await fetch(`/api/discount/apply?code=${discountCode}`);
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Failed to apply discount code",
          variant: "destructive",
        });
        setDiscountError(data.error);
        return;
      }

      setAppliedDiscounts([...appliedDiscounts, data]);
      setDiscountCode("");
      setDiscountError(null);
      toast({
        title: "Success",
        description: "Discount code applied successfully",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to apply discount code. Please try again.",
        variant: "destructive",
      });
      setDiscountError("Failed to apply discount code");
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      console.log("Cart items:", JSON.stringify(state.items));

      if (values.rememberDetails) {
        const { rememberDetails, paymentType, ...detailsToSave } = values;
        localStorage.setItem(
          `userDetails_${userId}`,
          JSON.stringify(detailsToSave)
        );
      }

      const orderDetailsResponse = await fetch("/api/order-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...values, userId, appliedDiscounts }),
      });

      if (!orderDetailsResponse.ok) {
        const errorData = await orderDetailsResponse.json();
        throw new Error(errorData.error || "Failed to save order details");
      }

      const savedDetails = await orderDetailsResponse.json();

      if (values.paymentType === "ramburs") {
        const createOrderResponse = await fetch("/api/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: state.items,
            userId: userId,
            detailsId: savedDetails.id,
            paymentType: "ramburs",
            appliedDiscounts,
          }),
        });

        const responseData = await createOrderResponse.json();

        if (!createOrderResponse.ok) {
          throw new Error(responseData.error || "Failed to create order");
        }

        const orderId = responseData.id;
        if (!orderId) {
          toast({
            title: "Eroare",
            description: "Nu s-a putut obține ID-ul comenzii. Vă rugăm să reîncercați.",
            variant: "destructive",
          });
          return;
        }
        dispatch({ type: "CLEAR_CART" });
        router.push(`/checkout/success?order_id=${orderId}`);
      } else {
        const checkoutResponse = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: state.items,
            userId: userId,
            detailsId: savedDetails.id,
            paymentType: "card",
            appliedDiscounts,
          }),
        });

        const responseData = await checkoutResponse.json();

        if (!checkoutResponse.ok) {
          throw new Error(
            responseData.error || "Failed to create checkout session"
          );
        }

        const { sessionId } = responseData;
        const stripe = await stripePromise;

        if (!stripe) {
          throw new Error("Failed to load Stripe");
        }

        const { error } = await stripe.redirectToCheckout({ sessionId });

        if (error) {
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Error processing order:", error);
      toast({
        title: "Eroare",
        description:
          error.message ||
          "Nu am putut procesa comanda. Vă rugăm să încercați din nou.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const subtotal = state.items.reduce(
    (acc, item) => acc + item.variant.price * item.quantity,
    0
  );
  const shipping = 15; // Fixed shipping cost

  // Calculate discounts and adjusted costs
  const percentageDiscount = appliedDiscounts
    .filter((d) => d.type === "percentage")
    .reduce((acc, discount) => acc + (subtotal * discount.value) / 100, 0);

  const fixedDiscount = appliedDiscounts
    .filter((d) => d.type === "fixed")
    .reduce((acc, discount) => acc + discount.value, 0);

  const hasShippingDiscount = appliedDiscounts.some(
    (d) => d.type === "free_shipping"
  );

  const adjustedSubtotal = Math.max(
    0,
    subtotal - percentageDiscount - fixedDiscount
  );
  const adjustedShipping = hasShippingDiscount ? 0 : shipping;
  const total = adjustedSubtotal + adjustedShipping;

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
      {/* Form - Now on the left */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Date personale</h2>
              <FormField
                control={form.control}
                name="isCompany"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Sunt persoană juridică</FormLabel>
                      <FormDescription>
                        Bifează această opțiune dacă dorești să primești factură
                        pe persoană juridică
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume complet</FormLabel>
                      <FormControl>
                        <Input placeholder="Nume și prenume" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Număr de telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="07XXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("isCompany") && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="text-lg font-medium">
                    Date facturare persoană juridică
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nume firmă</FormLabel>
                          <FormControl>
                            <Input placeholder="Numele companiei" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyCUI"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cod unic de înregistrare (CUI)</FormLabel>
                          <FormControl>
                            <Input placeholder="RO12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyRegNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Număr de înregistrare Registrul Comerțului
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="J40/123/2023" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyCounty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Județ</FormLabel>
                          <FormControl>
                            <Input placeholder="Județul" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localitate</FormLabel>
                          <FormControl>
                            <Input placeholder="Orașul" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresă</FormLabel>
                          <FormControl>
                            <Input placeholder="Strada, număr" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="text-lg font-medium">Adresă de livrare</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strada și numărul</FormLabel>
                        <FormControl>
                          <Input placeholder="Strada, număr" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Oraș</FormLabel>
                        <FormControl>
                          <Input placeholder="Orașul" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="county"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Județ</FormLabel>
                        <FormControl>
                          <Input placeholder="Județul" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cod poștal</FormLabel>
                        <FormControl>
                          <Input placeholder="Cod poștal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Țară</FormLabel>
                        <FormControl>
                          <Input placeholder="Țara" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note comandă (opțional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Instrucțiuni speciale pentru livrare sau alte observații"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Metodă plată</h2>
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 rounded-lg border p-4 cursor-pointer [&:has(:checked)]:bg-gray-50">
                        <input
                          type="radio"
                          id="card"
                          value="card"
                          checked={field.value === "card"}
                          onChange={() => field.onChange("card")}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor="card"
                          className="flex-grow cursor-pointer"
                        >
                          Plată cu cardul
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-lg border p-4 cursor-pointer [&:has(:checked)]:bg-gray-50">
                        <input
                          type="radio"
                          id="ramburs"
                          value="ramburs"
                          checked={field.value === "ramburs"}
                          onChange={() => field.onChange("ramburs")}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor="ramburs"
                          className="flex-grow cursor-pointer"
                        >
                          Ramburs la curier
                        </label>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rememberDetails"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Salvează detaliile pentru data viitoare
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? "Se procesează..."
                : form.getValues("paymentType") === "card"
                ? "Continuă la plată"
                : "Finalizează comanda"}
            </Button>
          </form>
        </Form>
      </div>

      {/* Order Summary - Now on the right */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Sumar comandă</h2>
          <div className="space-y-4">
            {state.items.map((item) => (
              <div
                key={`${item.product.id}-${item.selectedColor}`}
                className="flex items-start space-x-4"
              >
                <div className="relative w-20 h-20 flex-shrink-0">
                  <Image
                    src={item.product.images[0] || "/placeholder.svg"}
                    alt={item.product.name}
                    fill
                    className="object-cover rounded"
                  />
                  <span className="absolute -top-2 -right-2 bg-gray-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-grow">
                  <h3 className="font-medium">{item.product.name}</h3>
                  <p className="text-sm text-gray-600">
                    Color: {item.selectedColor}
                  </p>
                  <CustomerPriceGate>
                    <p className="text-sm font-medium">
                      {item.variant.price.toFixed(2)} lei × {item.quantity}
                    </p>
                  </CustomerPriceGate>
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            <Label htmlFor="discountCode">Cod discount</Label>
            <div className="flex space-x-2">
              <Input
                id="discountCode"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Introdu codul"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyDiscount();
                  }
                }}
              />
              <Button onClick={handleApplyDiscount}>Aplică</Button>
            </div>
            {discountError && (
              <p className="text-red-500 text-sm">{discountError}</p>
            )}
            {appliedDiscounts.length > 0 && (
              <CustomerPriceGate>
                <>
                  {appliedDiscounts.map((discount) => (
                    <div
                      key={discount.code}
                      className="flex justify-between items-center"
                    >
                      <span>{discount.code}</span>
                      <span>
                        {discount.type === "free_shipping"
                          ? "Transport gratuit"
                          : discount.type === "percentage"
                          ? `-${discount.value}%`
                          : `-${discount.value.toFixed(2)} RON`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAppliedDiscounts(
                            appliedDiscounts.filter(
                              (d) => d.code !== discount.code
                            )
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </>
              </CustomerPriceGate>
            )}
          </div>
          <CustomerPriceGate>
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <div className="text-right">
                  <span
                    className={
                      percentageDiscount > 0 || fixedDiscount > 0
                        ? "line-through text-gray-500"
                        : ""
                    }
                  >
                    {subtotal.toFixed(2)} lei
                  </span>
                  {(percentageDiscount > 0 || fixedDiscount > 0) && (
                    <div className="text-green-600">
                      {adjustedSubtotal.toFixed(2)} lei
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span>Transport</span>
                <div className="text-right">
                  <span
                    className={
                      hasShippingDiscount ? "line-through text-gray-500" : ""
                    }
                  >
                    {shipping.toFixed(2)} lei
                  </span>
                  {hasShippingDiscount && (
                    <div className="text-green-600">0,00 lei</div>
                  )}
                </div>
              </div>

              <Separator className="my-2" />

              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{total.toFixed(2)} lei</span>
              </div>
            </div>
          </CustomerPriceGate>
        </div>
      </div>
    </div>
  );
}
