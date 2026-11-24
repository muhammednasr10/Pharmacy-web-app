import type { PharmacyWalletType } from "../../../types";

export type WalletFormState = {
  name: string;
  walletType: PharmacyWalletType;
  balance: number;
  notes: string;
};

export type TransferFormState = {
  fromWalletId: string;
  toWalletId: string;
  amount: string;
};

export const emptyWalletForm: WalletFormState = {
  name: "",
  walletType: "cash",
  balance: 0,
  notes: "",
};

export const emptyTransferForm: TransferFormState = {
  fromWalletId: "",
  toWalletId: "",
  amount: "",
};
