# Quick Reference: Adding New Pages

> **IMPORTANT**: This app supports two layout modes. When adding a new page, you MUST add routes in TWO places or it will break for users in Simple Layout mode!

## Checklist

- [ ] Create page component in `client/src/pages/`
- [ ] Add to `AppLayout.tsx` componentMap (FlexLayout mode)
- [ ] Add to `App.tsx` routes (Simple Layout mode) ⚠️ **DON'T FORGET THIS!**
- [ ] Add to `config/navigation.ts`
- [ ] Test both modes

## Files to Edit

1. **`client/src/components/layout/AppLayout.tsx`**
   ```tsx
   const componentMap = {
     '/my-page': MyPage,  // Add here
   };
   ```

2. **`client/src/App.tsx`** ⚠️ **CRITICAL**
   ```tsx
   import MyPage from "@/pages/MyPage";
   
   // In the if (!useFlexLayout) section:
   <Route path="/my-page" component={MyPage} />
   ```

3. **`client/src/config/navigation.ts`**
   ```tsx
   {
     name: "My Page",
     href: "/my-page",
     icon: YourIcon,
   }
   ```

## Test Both Modes

1. **FlexLayout ON**: Page opens in tab
2. **FlexLayout OFF**: Page loads normally (Settings → Theme → Toggle "Use Multi-Tab Layout")

📖 **Full Documentation**: See `docs/ADDING_NEW_PAGES.md`
