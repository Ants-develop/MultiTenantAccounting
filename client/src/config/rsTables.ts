// RS Integration Tables Configuration
// Configuration for RS.ge (Revenue Service of Georgia) integration data tables

export interface RSTableColumn {
  data: string;
  title: string;
  type?: 'text' | 'numeric' | 'date';
  readOnly?: boolean;
}

export interface RSTableConfig {
  displayName: string;
  displayNameKa: string;
  apiEndpoint: string;
  columns: RSTableColumn[];
}

export const rsTables: Record<string, RSTableConfig> = {
  seller_invoices: {
    displayName: 'Seller Invoices',
    displayNameKa: 'გამავალი ინვოისები',
    apiEndpoint: 'seller_invoices',
    columns: [
      { data: 'INVOICE_ID', title: 'Invoice ID', type: 'text' },
      { data: 'F_DATE', title: 'Date', type: 'text' },
      { data: 'F_SERIES', title: 'Series', type: 'text' },
      { data: 'F_NUMBER', title: 'Number', type: 'text' },
      { data: 'BUYER_TIN', title: 'Buyer TIN', type: 'text' },
      { data: 'BUYER_NAME', title: 'Buyer Name', type: 'text' },
      { data: 'SELLER_TIN', title: 'Seller TIN', type: 'text' },
      { data: 'SELLER_NAME', title: 'Seller Name', type: 'text' },
      { data: 'AMOUNT', title: 'Amount', type: 'numeric' },
      { data: 'AQCIZI_AMOUNT', title: 'Excise', type: 'numeric' },
      { data: 'DRG_AMOUNT', title: 'VAT', type: 'numeric' },
      { data: 'FULL_AMOUNT', title: 'Total', type: 'numeric' },
      { data: 'STATUS', title: 'Status', type: 'text' },
      { data: 'SUP_TYPE', title: 'Supply Type', type: 'text' },
      { data: 'WAYBILL_NUMBER', title: 'Waybill', type: 'text' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  buyer_invoices: {
    displayName: 'Buyer Invoices',
    displayNameKa: 'შემომავალი ინვოისები',
    apiEndpoint: 'buyer_invoices',
    columns: [
      { data: 'INVOICE_ID', title: 'Invoice ID', type: 'text' },
      { data: 'F_DATE', title: 'Date', type: 'text' },
      { data: 'F_SERIES', title: 'Series', type: 'text' },
      { data: 'F_NUMBER', title: 'Number', type: 'text' },
      { data: 'SELLER_TIN', title: 'Seller TIN', type: 'text' },
      { data: 'SELLER_NAME', title: 'Seller Name', type: 'text' },
      { data: 'BUYER_TIN', title: 'Buyer TIN', type: 'text' },
      { data: 'BUYER_NAME', title: 'Buyer Name', type: 'text' },
      { data: 'AMOUNT', title: 'Amount', type: 'numeric' },
      { data: 'AQCIZI_AMOUNT', title: 'Excise', type: 'numeric' },
      { data: 'DRG_AMOUNT', title: 'VAT', type: 'numeric' },
      { data: 'FULL_AMOUNT', title: 'Total', type: 'numeric' },
      { data: 'STATUS', title: 'Status', type: 'text' },
      { data: 'SUP_TYPE', title: 'Supply Type', type: 'text' },
      { data: 'WAYBILL_NUMBER', title: 'Waybill', type: 'text' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  spec_seller_invoices: {
    displayName: 'Special Seller Invoices (NSAF)',
    displayNameKa: 'სპეციალური გამავალი ინვოისები (NSAF)',
    apiEndpoint: 'spec_seller_invoices',
    columns: [
      { data: 'INVOICE_ID', title: 'Invoice ID', type: 'text' },
      { data: 'F_DATE', title: 'Date', type: 'text' },
      { data: 'F_SERIES', title: 'Series', type: 'text' },
      { data: 'F_NUMBER', title: 'Number', type: 'text' },
      { data: 'BUYER_TIN', title: 'Buyer TIN', type: 'text' },
      { data: 'BUYER_NAME', title: 'Buyer Name', type: 'text' },
      { data: 'SELLER_TIN', title: 'Seller TIN', type: 'text' },
      { data: 'SELLER_NAME', title: 'Seller Name', type: 'text' },
      { data: 'FULL_AMOUNT', title: 'Total', type: 'numeric' },
      { data: 'STATUS', title: 'Status', type: 'text' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  spec_buyer_invoices: {
    displayName: 'Special Buyer Invoices (NSAF)',
    displayNameKa: 'სპეციალური შემომავალი ინვოისები (NSAF)',
    apiEndpoint: 'spec_buyer_invoices',
    columns: [
      { data: 'INVOICE_ID', title: 'Invoice ID', type: 'text' },
      { data: 'F_DATE', title: 'Date', type: 'text' },
      { data: 'F_SERIES', title: 'Series', type: 'text' },
      { data: 'F_NUMBER', title: 'Number', type: 'text' },
      { data: 'SELLER_TIN', title: 'Seller TIN', type: 'text' },
      { data: 'SELLER_NAME', title: 'Seller Name', type: 'text' },
      { data: 'BUYER_TIN', title: 'Buyer TIN', type: 'text' },
      { data: 'BUYER_NAME', title: 'Buyer Name', type: 'text' },
      { data: 'FULL_AMOUNT', title: 'Total', type: 'numeric' },
      { data: 'STATUS', title: 'Status', type: 'text' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  sellers_waybills: {
    displayName: 'Sellers Waybills',
    displayNameKa: 'გამავალი ზედნადებები',
    apiEndpoint: 'sellers_waybills',
    columns: [
      { data: 'EXTERNAL_ID', title: 'Waybill ID', type: 'text' },
      { data: 'TYPE', title: 'Type', type: 'text' },
      { data: 'CREATE_DATE', title: 'Created', type: 'text' },
      { data: 'WAYBILL_NUMBER', title: 'Number', type: 'text' },
      { data: 'SELLER_TIN', title: 'Seller TIN', type: 'text' },
      { data: 'SELLER_NAME', title: 'Seller', type: 'text' },
      { data: 'BUYER_TIN', title: 'Buyer TIN', type: 'text' },
      { data: 'BUYER_NAME', title: 'Buyer', type: 'text' },
      { data: 'START_ADDRESS', title: 'From', type: 'text' },
      { data: 'END_ADDRESS', title: 'To', type: 'text' },
      { data: 'DRIVER_NAME', title: 'Driver', type: 'text' },
      { data: 'CAR_NUMBER', title: 'Car', type: 'text' },
      { data: 'FULL_AMOUNT', title: 'Amount', type: 'numeric' },
      { data: 'TRANSPORT_COAST', title: 'Transport Cost', type: 'numeric' },
      { data: 'STATUS', title: 'Status', type: 'text' },
      { data: 'IS_CONFIRMED', title: 'Confirmed', type: 'text' },
      { data: 'IS_CORRECTED', title: 'Corrected', type: 'text' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  buyers_waybills: {
    displayName: 'Buyers Waybills',
    displayNameKa: 'შემომავალი ზედნადებები',
    apiEndpoint: 'buyers_waybills',
    columns: [
      { data: 'EXTERNAL_ID', title: 'Waybill ID', type: 'text' },
      { data: 'TYPE', title: 'Type', type: 'text' },
      { data: 'CREATE_DATE', title: 'Created', type: 'text' },
      { data: 'WAYBILL_NUMBER', title: 'Number', type: 'text' },
      { data: 'SELLER_TIN', title: 'Seller TIN', type: 'text' },
      { data: 'SELLER_NAME', title: 'Seller', type: 'text' },
      { data: 'BUYER_TIN', title: 'Buyer TIN', type: 'text' },
      { data: 'BUYER_NAME', title: 'Buyer', type: 'text' },
      { data: 'START_ADDRESS', title: 'From', type: 'text' },
      { data: 'END_ADDRESS', title: 'To', type: 'text' },
      { data: 'DRIVER_NAME', title: 'Driver', type: 'text' },
      { data: 'CAR_NUMBER', title: 'Car', type: 'text' },
      { data: 'FULL_AMOUNT', title: 'Amount', type: 'numeric' },
      { data: 'TRANSPORT_COAST', title: 'Transport Cost', type: 'numeric' },
      { data: 'STATUS', title: 'Status', type: 'text' },
      { data: 'IS_CONFIRMED', title: 'Confirmed', type: 'text' },
      { data: 'IS_CORRECTED', title: 'Corrected', type: 'text' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  sellers_waybill_goods: {
    displayName: 'Sellers Waybill Goods',
    displayNameKa: 'გამავალი ზედნადების საქონელი',
    apiEndpoint: 'sellers_waybill_goods',
    columns: [
      { data: 'WAYBILL_ID', title: 'Waybill ID', type: 'text' },
      { data: 'W_NAME', title: 'Goods Name', type: 'text' },
      { data: 'A_ID', title: 'Article ID', type: 'text' },
      { data: 'BAR_CODE', title: 'Barcode', type: 'text' },
      { data: 'QUANTITY', title: 'Quantity', type: 'numeric' },
      { data: 'UNIT_TXT', title: 'Unit', type: 'text' },
      { data: 'PRICE', title: 'Price', type: 'numeric' },
      { data: 'AMOUNT', title: 'Amount', type: 'numeric' },
      { data: 'VAT_TYPE', title: 'VAT Type', type: 'text' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  buyers_waybill_goods: {
    displayName: 'Buyers Waybill Goods',
    displayNameKa: 'შემომავალი ზედნადების საქონელი',
    apiEndpoint: 'buyers_waybill_goods',
    columns: [
      { data: 'WAYBILL_ID', title: 'Waybill ID', type: 'text' },
      { data: 'W_NAME', title: 'Goods Name', type: 'text' },
      { data: 'A_ID', title: 'Article ID', type: 'text' },
      { data: 'BAR_CODE', title: 'Barcode', type: 'text' },
      { data: 'QUANTITY', title: 'Quantity', type: 'numeric' },
      { data: 'UNIT_TXT', title: 'Unit', type: 'text' },
      { data: 'PRICE', title: 'Price', type: 'numeric' },
      { data: 'AMOUNT', title: 'Amount', type: 'numeric' },
      { data: 'VAT_TYPE', title: 'VAT Type', type: 'text' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  sellers_invoice_goods: {
    displayName: 'Sellers Invoice Goods',
    displayNameKa: 'გამავალი ინვოისის საქონელი',
    apiEndpoint: 'sellers_invoice_goods',
    columns: [
      { data: 'INVOICE_ID', title: 'Invoice ID', type: 'text' },
      { data: 'ID_GOODS', title: 'Goods ID', type: 'text' },
      { data: 'GOODS', title: 'Goods Description', type: 'text' },
      { data: 'G_NUMBER', title: 'Quantity', type: 'numeric' },
      { data: 'G_UNIT', title: 'Unit', type: 'text' },
      { data: 'AQCIZI_AMOUNT', title: 'Excise', type: 'numeric' },
      { data: 'DRG_AMOUNT', title: 'VAT', type: 'numeric' },
      { data: 'FULL_AMOUNT', title: 'Total', type: 'numeric' },
      { data: 'VAT_TYPE', title: 'VAT Type', type: 'text' },
      { data: 'WAYBILL_ID', title: 'Waybill ID', type: 'text' },
      { data: 'F_SERIES', title: 'Series', type: 'text' },
      { data: 'F_NUMBER', title: 'Number', type: 'text' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  buyers_invoice_goods: {
    displayName: 'Buyers Invoice Goods',
    displayNameKa: 'შემომავალი ინვოისის საქონელი',
    apiEndpoint: 'buyers_invoice_goods',
    columns: [
      { data: 'INVOICE_ID', title: 'Invoice ID', type: 'text' },
      { data: 'ID_GOODS', title: 'Goods ID', type: 'text' },
      { data: 'GOODS', title: 'Goods Description', type: 'text' },
      { data: 'G_NUMBER', title: 'Quantity', type: 'numeric' },
      { data: 'G_UNIT', title: 'Unit', type: 'text' },
      { data: 'AQCIZI_AMOUNT', title: 'Excise', type: 'numeric' },
      { data: 'DRG_AMOUNT', title: 'VAT', type: 'numeric' },
      { data: 'FULL_AMOUNT', title: 'Total', type: 'numeric' },
      { data: 'VAT_TYPE', title: 'VAT Type', type: 'text' },
      { data: 'WAYBILL_ID', title: 'Waybill ID', type: 'text' },
      { data: 'F_SERIES', title: 'Series', type: 'text' },
      { data: 'F_NUMBER', title: 'Number', type: 'text' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  spec_invoice_goods: {
    displayName: 'Special Invoice Goods (NSAF)',
    displayNameKa: 'სპეციალური ინვოისის საქონელი (NSAF)',
    apiEndpoint: 'spec_invoice_goods',
    columns: [
      { data: 'INVOICE_ID', title: 'Invoice ID', type: 'text' },
      { data: 'GOODS_NAME', title: 'Goods Name', type: 'text' },
      { data: 'QUANTITY', title: 'Quantity', type: 'numeric' },
      { data: 'UNIT', title: 'Unit', type: 'text' },
      { data: 'PRICE', title: 'Price', type: 'numeric' },
      { data: 'AMOUNT', title: 'Amount', type: 'numeric' },
      { data: 'VAT_AMOUNT', title: 'VAT', type: 'numeric' },
      { data: 'EXCISE_AMOUNT', title: 'Excise', type: 'numeric' },
      { data: 'UPDATED_AT', title: 'Updated', type: 'date' },
    ],
  },

  waybill_invoices: {
    displayName: 'Waybill-Invoice Links',
    displayNameKa: 'ზედნადები-ინვოისის კავშირები',
    apiEndpoint: 'waybill_invoices',
    columns: [
      { data: 'WAYBILL_EXTERNAL_ID', title: 'Waybill ID', type: 'text' },
      { data: 'INVOICE_ID', title: 'Invoice ID', type: 'text' },
      { data: 'WAYBILL_TYPE', title: 'Waybill Type', type: 'text' },
      { data: 'INVOICE_TYPE', title: 'Invoice Type', type: 'text' },
      { data: 'COMPANY_TIN', title: 'Company TIN', type: 'text' },
      { data: 'COMPANY_NAME', title: 'Company Name', type: 'text' },
      { data: 'CREATED_AT', title: 'Created', type: 'date' },
    ],
  },
};

// Helper to get table list for dropdown
export const getRSTableList = () => {
  return Object.entries(rsTables).map(([key, config]) => ({
    value: key,
    label: config.displayName,
    labelKa: config.displayNameKa,
  }));
};

