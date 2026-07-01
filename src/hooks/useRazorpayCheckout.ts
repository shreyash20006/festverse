import { useState } from "react";
import { openRazorpayCheckout } from "@/lib/razorpay";

export interface RazorpayCheckoutArgs {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  onSuccess: (resp: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  onDismiss?: () => void;
}

export function useRazorpayCheckout() {
  const [loading, setLoading] = useState(false);

  const open = async (args: RazorpayCheckoutArgs) => {
    setLoading(true);
    try {
      await openRazorpayCheckout(args);
    } finally {
      setLoading(false);
    }
  };

  return { open, loading };
}
