// PayPal's yellow checkout button, with the wordmark set in text (no image).
export function PayPalButton({ label = "Buy with", onClick, children }: { label?: string; onClick: () => void; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-paypal text-[14px] font-medium text-[#1a1a1a] transition-colors duration-150 outline-none hover:bg-paypal-hover focus-visible:ring-3 focus-visible:ring-ring/60 sm:h-10"
    >
      {children ?? (
        <>
          {label}
          <span className="text-[16px] font-bold tracking-[-0.03em] italic">
            <span className="text-paypal-blue">Pay</span>
            <span className="text-paypal-sky">Pal</span>
          </span>
        </>
      )}
    </button>
  );
}
