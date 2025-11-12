import React from "react";
import { registerAllModules } from "handsontable/registry";
import { HotTable, HotColumn } from "@handsontable/react-wrapper";
import { createRoot } from 'react-dom/client'

import "handsontable/styles/handsontable.min.css";
import "handsontable/styles/ht-theme-main.min.css";
import { defaultData } from './data';
registerAllModules();

createRoot(document.getElementById('root')).render(
<main>

<style>{`
.ht-theme-main {
  --ht-font-size: 14px;
  --ht-line-height: 20px;
  --ht-font-weight: 400;
  --ht-letter-spacing: 0;
  --ht-gap-size: 4px;
  --ht-icon-size: 16px;
  --ht-table-transition: 0.15s;
  --ht-border-color: #e7e7e9;
  --ht-accent-color: #1a42e8;
  --ht-foreground-color: #222222;
  --ht-background-color: #ffffff;
  --ht-placeholder-color: #a3a3a3;
  --ht-read-only-color: #68696c;
  --ht-disabled-color: #a3a3a3;
  --ht-cell-horizontal-border-color: #e7e7e9;
  --ht-cell-vertical-border-color: #e7e7e9;
  --ht-wrapper-border-width: 0;
  --ht-wrapper-border-radius: 4px;
  --ht-wrapper-border-color: #e7e7e9;
  --ht-row-header-odd-background-color: #f7f7f9;
  --ht-row-header-even-background-color: #f7f7f9;
  --ht-row-cell-odd-background-color: rgba(255, 255, 255, 0);
  --ht-row-cell-even-background-color: rgba(255, 255, 255, 0);
  --ht-cell-horizontal-padding: 8px;
  --ht-cell-vertical-padding: 4px;
  --ht-cell-editor-border-width: 2px;
  --ht-cell-editor-border-color: #1a42e8;
  --ht-cell-editor-foreground-color: #0f0f10;
  --ht-cell-editor-background-color: #ffffff;
  --ht-cell-editor-shadow-blur-radius: 0;
  --ht-cell-editor-shadow-color: #1a42e8;
  --ht-cell-success-background-color: rgba(55, 188, 108, 0.20);
  --ht-cell-error-background-color: rgba(250, 77, 50, 0.20);
  --ht-cell-read-only-background-color: rgba(34, 34, 34, 0.04);
  --ht-cell-selection-border-color: #1a42e8;
  --ht-cell-selection-background-color: #5371ee;
  --ht-cell-autofill-size: 6px;
  --ht-cell-autofill-border-width: 1px;
  --ht-cell-autofill-border-radius: 4px;
  --ht-cell-autofill-border-color: #ffffff;
  --ht-cell-autofill-background-color: #1a42e8;
  --ht-cell-autofill-fill-border-color: #222222;
  --ht-cell-mobile-handle-size: 12px;
  --ht-cell-mobile-handle-border-width: 1px;
  --ht-cell-mobile-handle-border-radius: 6px;
  --ht-cell-mobile-handle-border-color: #1a42e8;
  --ht-cell-mobile-handle-background-color: rgba(26, 66, 232, 0.40);
  --ht-resize-indicator-color: rgba(34, 34, 34, 0.40);
  --ht-move-backlight-color: rgba(34, 34, 34, 0.08);
  --ht-move-indicator-color: #1a42e8;
  --ht-hidden-indicator-color: rgba(34, 34, 34, 0.40);
  --ht-scrollbar-border-radius: 8px;
  --ht-scrollbar-track-color: #f7f7f9;
  --ht-scrollbar-thumb-color: #a3a3a3;
  --ht-header-font-weight: 400;
  --ht-header-foreground-color: #222222;
  --ht-header-background-color: #f7f7f9;
  --ht-header-highlighted-shadow-size: 0;
  --ht-header-highlighted-foreground-color: #0f0f10;
  --ht-header-highlighted-background-color: #ebebed;
  --ht-header-active-border-color: #2e56fc;
  --ht-header-active-foreground-color: #ffffff;
  --ht-header-active-background-color: #1a42e8;
  --ht-header-filter-background-color: rgba(55, 188, 108, 0.20);
  --ht-header-row-foreground-color: #222222;
  --ht-header-row-background-color: #f7f7f9;
  --ht-header-row-highlighted-foreground-color: #0f0f10;
  --ht-header-row-highlighted-background-color: #ebebed;
  --ht-header-row-active-foreground-color: #ffffff;
  --ht-header-row-active-background-color: #1a42e8;
  --ht-checkbox-size: 16px;
  --ht-checkbox-border-radius: 4px;
  --ht-checkbox-border-color: #d1d1d5;
  --ht-checkbox-background-color: #ffffff;
  --ht-checkbox-icon-color: rgba(255, 255, 255, 0);
  --ht-checkbox-focus-border-color: #d1d1d5;
  --ht-checkbox-focus-background-color: #ffffff;
  --ht-checkbox-focus-icon-color: rgba(255, 255, 255, 0);
  --ht-checkbox-focus-ring-color: #1a42e8;
  --ht-checkbox-disabled-border-color: #e7e7e9;
  --ht-checkbox-disabled-background-color: #d1d1d5;
  --ht-checkbox-disabled-icon-color: rgba(255, 255, 255, 0);
  --ht-checkbox-checked-border-color: #2e56fc;
  --ht-checkbox-checked-background-color: #1a42e8;
  --ht-checkbox-checked-icon-color: #ffffff;
  --ht-checkbox-checked-focus-border-color: #ffffff;
  --ht-checkbox-checked-focus-background-color: #1a42e8;
  --ht-checkbox-checked-focus-icon-color: #ffffff;
  --ht-checkbox-checked-disabled-border-color: #e7e7e9;
  --ht-checkbox-checked-disabled-background-color: #d1d1d5;
  --ht-checkbox-checked-disabled-icon-color: #a3a3a3;
  --ht-checkbox-indeterminate-border-color: #2e56fc;
  --ht-checkbox-indeterminate-background-color: #1a42e8;
  --ht-checkbox-indeterminate-icon-color: #ffffff;
  --ht-checkbox-indeterminate-focus-border-color: #ffffff;
  --ht-checkbox-indeterminate-focus-background-color: #1a42e8;
  --ht-checkbox-indeterminate-focus-icon-color: #ffffff;
  --ht-checkbox-indeterminate-disabled-border-color: #e7e7e9;
  --ht-checkbox-indeterminate-disabled-background-color: #d1d1d5;
  --ht-checkbox-indeterminate-disabled-icon-color: #aeaeae;
  --ht-radio-size: 16px;
  --ht-radio-border-color: #d1d1d5;
  --ht-radio-background-color: #ffffff;
  --ht-radio-icon-color: rgba(255, 255, 255, 0);
  --ht-radio-focus-border-color: #e7e7e9;
  --ht-radio-focus-background-color: #ffffff;
  --ht-radio-focus-icon-color: rgba(255, 255, 255, 0);
  --ht-radio-focus-ring-color: #1a42e8;
  --ht-radio-disabled-border-color: #e7e7e9;
  --ht-radio-disabled-background-color: #d1d1d5;
  --ht-radio-disabled-icon-color: rgba(255, 255, 255, 0);
  --ht-radio-checked-border-color: #1a42e8;
  --ht-radio-checked-background-color: #ffffff;
  --ht-radio-checked-icon-color: #1a42e8;
  --ht-radio-checked-focus-border-color: #2e56fc;
  --ht-radio-checked-focus-background-color: #ffffff;
  --ht-radio-checked-focus-icon-color: #2e56fc;
  --ht-radio-checked-disabled-border-color: #e7e7e9;
  --ht-radio-checked-disabled-background-color: #d1d1d5;
  --ht-radio-checked-disabled-icon-color: #a3a3a3;
  --ht-icon-button-border-radius: 2px;
  --ht-icon-button-border-color: #f7f7f9;
  --ht-icon-button-background-color: #f7f7f9;
  --ht-icon-button-icon-color: rgba(34, 34, 34, 0.40);
  --ht-icon-button-hover-border-color: #e7e7e9;
  --ht-icon-button-hover-background-color: #e7e7e9;
  --ht-icon-button-hover-icon-color: rgba(34, 34, 34, 0.40);
  --ht-icon-button-active-border-color: #1a42e8;
  --ht-icon-button-active-background-color: #1a42e8;
  --ht-icon-button-active-icon-color: #ffffff;
  --ht-icon-button-active-hover-border-color: #2e56fc;
  --ht-icon-button-active-hover-background-color: #2e56fc;
  --ht-icon-button-active-hover-icon-color: #ffffff;
  --ht-collapse-button-border-radius: 4px;
  --ht-collapse-button-open-border-color: #d1d1d5;
  --ht-collapse-button-open-background-color: #ffffff;
  --ht-collapse-button-open-icon-color: #68696c;
  --ht-collapse-button-open-icon-active-color: #68696c;
  --ht-collapse-button-open-hover-border-color: #d1d1d5;
  --ht-collapse-button-open-hover-background-color: #f7f7f9;
  --ht-collapse-button-open-hover-icon-color: #68696c;
  --ht-collapse-button-open-hover-icon-active-color: #68696c;
  --ht-collapse-button-close-border-color: #d1d1d5;
  --ht-collapse-button-close-background-color: #ebebed;
  --ht-collapse-button-close-icon-color: #68696c;
  --ht-collapse-button-close-icon-active-color: #68696c;
  --ht-collapse-button-close-hover-border-color: #d1d1d5;
  --ht-collapse-button-close-hover-background-color: #ebebed;
  --ht-collapse-button-close-hover-icon-color: #68696c;
  --ht-collapse-button-close-hover-icon-active-color: #68696c;
  --ht-button-border-radius: 4px;
  --ht-button-horizontal-padding: 12px;
  --ht-button-vertical-padding: 6px;
  --ht-primary-button-border-color: rgba(255, 255, 255, 0);
  --ht-primary-button-foreground-color: #ffffff;
  --ht-primary-button-background-color: #1a42e8;
  --ht-primary-button-disabled-border-color: rgba(255, 255, 255, 0);
  --ht-primary-button-disabled-foreground-color: #a3a3a3;
  --ht-primary-button-disabled-background-color: #ebebed;
  --ht-primary-button-hover-border-color: rgba(255, 255, 255, 0);
  --ht-primary-button-hover-foreground-color: #ffffff;
  --ht-primary-button-hover-background-color: #1535bc;
  --ht-primary-button-focus-border-color: #ffffff;
  --ht-primary-button-focus-foreground-color: #ffffff;
  --ht-primary-button-focus-background-color: #1a42e8;
  --ht-secondary-button-border-color: #e7e7e9;
  --ht-secondary-button-foreground-color: #222222;
  --ht-secondary-button-background-color: #ffffff;
  --ht-secondary-button-disabled-border-color: #e7e7e9;
  --ht-secondary-button-disabled-foreground-color: #a3a3a3;
  --ht-secondary-button-disabled-background-color: #ebebed;
  --ht-secondary-button-hover-border-color: #e7e7e9;
  --ht-secondary-button-hover-foreground-color: #222222;
  --ht-secondary-button-hover-background-color: #e7e7e9;
  --ht-secondary-button-focus-border-color: #e7e7e9;
  --ht-secondary-button-focus-foreground-color: #222222;
  --ht-secondary-button-focus-background-color: #ffffff;
  --ht-comments-textarea-horizontal-padding: 8px;
  --ht-comments-textarea-vertical-padding: 4px;
  --ht-comments-textarea-border-width: 1px;
  --ht-comments-textarea-border-color: rgba(255, 255, 255, 0);
  --ht-comments-textarea-foreground-color: #222222;
  --ht-comments-textarea-background-color: #f7f7f9;
  --ht-comments-textarea-focus-border-width: 1px;
  --ht-comments-textarea-focus-border-color: #1a42e8;
  --ht-comments-textarea-focus-foreground-color: #222222;
  --ht-comments-textarea-focus-background-color: #ffffff;
  --ht-comments-indicator-size: 6px;
  --ht-comments-indicator-color: #1a42e8;
  --ht-license-horizontal-padding: 16px;
  --ht-license-vertical-padding: 8px;
  --ht-license-foreground-color: #222222;
  --ht-license-background-color: #f7f7f9;
  --ht-link-color: #1a42e8;
  --ht-link-hover-color: #5371ee;
  --ht-input-border-width: 1px;
  --ht-input-border-radius: 4px;
  --ht-input-horizontal-padding: 12px;
  --ht-input-vertical-padding: 6px;
  --ht-input-border-color: #e7e7e9;
  --ht-input-foreground-color: #222222;
  --ht-input-background-color: #f7f7f9;
  --ht-input-hover-border-color: #e7e7e9;
  --ht-input-hover-foreground-color: #222222;
  --ht-input-hover-background-color: #ffffff;
  --ht-input-disabled-border-color: #e7e7e9;
  --ht-input-disabled-foreground-color: #a3a3a3;
  --ht-input-disabled-background-color: #d1d1d5;
  --ht-input-focus-border-color: #1a42e8;
  --ht-input-focus-foreground-color: #222222;
  --ht-input-focus-background-color: #ffffff;
  --ht-menu-border-width: 1px;
  --ht-menu-border-radius: 4px;
  --ht-menu-horizontal-padding: 0;
  --ht-menu-vertical-padding: 8px;
  --ht-menu-item-horizontal-padding: 12px;
  --ht-menu-item-vertical-padding: 4px;
  --ht-menu-border-color: #e7e7e9;
  --ht-menu-shadow-x: 0;
  --ht-menu-shadow-y: 8px;
  --ht-menu-shadow-blur: 16px;
  --ht-menu-shadow-color: rgba(34, 34, 34, 0.08);
  --ht-menu-item-hover-color: rgba(34, 34, 34, 0.04);
  --ht-menu-item-active-color: rgba(34, 34, 34, 0.08);
} `}
</style>

<HotTable
  themeName="ht-theme-main"
  data={defaultData}
  height="auto"
  width="900px"
  licenseKey="non-commercial-and-evaluation" // for non-commercial use only
    nestedHeaders={[
  [
    {
      "label": "User",
      "colspan": 4
    },
    {
      "label": "Account Details",
      "colspan": 3
    },
    {
      "label": "Login information",
      "colspan": 2
    }
  ],
  [
    "Name",
    "Age",
    "Country",
    "City",
    "Active",
    "Interest",
    "Favorite Product",
    "Login date",
    "Login time"
  ]
]}
  hiddenColumns={{
  "indicators": true
}}
  hiddenRows={{
  "indicators": true
}}
  contextMenu={[
  "cut",
  "copy",
  "---------",
  "row_above",
  "row_below",
  "remove_row",
  "---------",
  "alignment",
  "make_read_only",
  "clear_column"
]}
  headerClassName={"htLeft"}
  colHeaders={true}
  collapsibleColumns={true}
  filters={true}
  dropdownMenu={true}
  comments={true}
  multiColumnSorting={true}
  manualColumnResize={true}
  manualRowMove={true}
  manualRowResize={true}
  autoWrapRow={true}
  rowHeaders={true}
  navigableHeaders={true}
>
  <HotColumn data="name" width={160} />
  <HotColumn data="age" type="numeric" width={100} />
  <HotColumn
    data="country"
    type="autocomplete"
    source={[
      "Germany",
      "China",
      "France",
      "Netherlands",
      "Switzerland",
      "USA",
      "Canada",
      "UK",
      "Australia",
      "Spain",
      "Japan",
      "Brazil",
      "South Korea",
      "Mexico",
    ]}
    strict={true}
    allowInvalid={true}
    width={160}
  />
  <HotColumn
    data="city"
    type="dropdown"
    source={[
      "Walldorf",
      "Shenzhen",
      "Lyon",
      "Amsterdam",
      "Zurich",
      "New York",
      "Toronto",
      "London",
      "Sydney",
      "Los Angeles",
      "Barcelona",
      "Tokyo",
      "Manchester",
      "Sao Paulo",
      "Miami",
      "Madrid",
      "Seoul",
      "Vancouver",
      "Valencia",
      "Chicago",
      "Mexico City",
      "Houston",
    ]}
    width={160}
  />
  <HotColumn
    data="isActive"
    type="checkbox"
    className="htCenter"
    width={120}
  />
  <HotColumn
    data="interest"
    type="dropdown"
    source={[
      "Electronics",
      "Fashion",
      "Tech Gadgets",
      "Home Decor",
      "Sports & Fitness",
      "Books & Literature",
      "Beauty & Personal Care",
      "Food & Cooking",
      "Travel & Adventure",
      "Art & Collectibles",
    ]}
    width={220}
  />
  <HotColumn data="favoriteProduct" width={180} />
  <HotColumn
    data="lastLoginDate"
    type="date"
    className="htRight"
    correctFormat={true}
    dateFormat="MMM DD, YYYY"
    width={180}
  />
  <HotColumn
    data="lastLoginTime"
    type="time"
    className="htRight"
    correctFormat={true}
    timeFormat="HH:mm"
    width={180}
  />
</HotTable>
</main>
)