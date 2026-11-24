/** POS E2E helpers — barrel re-exports for stable import paths. */
export { ensurePosReady } from "./pos/ready";
export { addBarcodeToCart, restockBarcode } from "./pos/cart";
export {
  completePosSale,
  fillPosCustomerDetails,
  holdCurrentCart,
  resumeFirstHeldInvoice,
  selectPosPaymentMethod,
} from "./pos/checkout";
export { requestPurchaseFromSmartSearch } from "./pos/purchaseRequest";
