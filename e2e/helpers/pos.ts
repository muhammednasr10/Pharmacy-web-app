/** POS E2E helpers — barrel re-exports for stable import paths. */
export { ensurePosReady } from "./pos/ready";
export { addBarcodeToCart, restockBarcode } from "./pos/cart";
export {
  completePosSale,
  holdCurrentCart,
  resumeFirstHeldInvoice,
  selectPosPaymentMethod,
} from "./pos/checkout";
export { fillPosCustomerDetails } from "./pos/customerDetails";
export { selectPosDeliveryEmployee } from "./pos/deliveryEmployee";
export { requestPurchaseFromSmartSearch } from "./pos/purchaseRequest";
