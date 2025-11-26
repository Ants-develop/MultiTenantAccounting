// Default Chart of Accounts Seeding Service
import { db } from "../db";
import { accounts } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Creates default chart of accounts for a client company
 * @param clientId - The ID of the client to create accounts for
 * @returns Promise<number> - Number of accounts created
 */
export async function createDefaultAccountsForClient(clientId: number): Promise<number> {
    try {
        // Check if accounts already exist for this client
        const existing = await db.select().from(accounts).where(eq(accounts.clientId, clientId));

        if (existing.length > 0) {
            console.log(`⏭️  Skipped default accounts creation for client ${clientId} - accounts already exist`);
            return 0;
        }

        const defaults = [
            // Main accounts
            { code: "0000", name: "საწყისი ნაშთების შუალედური ანგარიში", type: "asset" as const, accountClass: "ზოგადი", category: "დამხმარე" },

            // 1000 - Current Assets
            { code: "1000", name: "მიმდინარე აქტივები", type: "asset" as const, category: "აქტივები" },
            { code: "1100", name: "ნაღდი ფული სალაროში", type: "asset" as const, parentCode: "1000", category: "აქტივები" },
            { code: "1200", name: "ფული საბანკო ანგარიშებზე", type: "asset" as const, parentCode: "1000", category: "აქტივები" },
            { code: "1300", name: "მოკლევადიანი ინვესტიციები", type: "asset" as const, parentCode: "1000", category: "აქტივები" },
            { code: "1400", name: "მოკლევადიანი მოთხოვნები", type: "asset" as const, parentCode: "1000", category: "აქტივები" },
            { code: "1600", name: "სასაქონლო-მატერიალური მარაგი", type: "asset" as const, parentCode: "1000", category: "აქტივები" },
            { code: "1700", name: "წინასწარ გაწეული ხარჯები", type: "asset" as const, parentCode: "1000", category: "აქტივები" },
            { code: "1800", name: "დარიცხული მოთხოვნები", type: "asset" as const, parentCode: "1000", category: "აქტივები" },

            // 2000 - Long-term Assets
            { code: "2000", name: "გრძელვადიანი აქტივები", type: "asset" as const, category: "აქტივები" },
            { code: "2100", name: "ძირითადი საშუალებები", type: "asset" as const, parentCode: "2000", category: "აქტივები" },
            { code: "2200", name: "ძირითადი საშუალებების ცვეთა", type: "asset" as const, parentCode: "2000", category: "აქტივები" },
            { code: "2300", name: "გრძელვადიანი მოთხოვნები", type: "asset" as const, parentCode: "2000", category: "აქტივები" },
            { code: "2400", name: "არამატერიალური აქტივები", type: "asset" as const, parentCode: "2000", category: "აქტივები" },
            { code: "2500", name: "არამატერიალური აქტივების ამორტიზაცია", type: "asset" as const, parentCode: "2000", category: "აქტივები" },

            // 3000 - Current Liabilities
            { code: "3000", name: "მიმდინარე ვალდებულებები", type: "liability" as const, category: "ვალდებულება" },
            { code: "3100", name: "მოკლევადიანი ვალდებულებები", type: "liability" as const, parentCode: "3000", category: "ვალდებულება" },
            { code: "3200", name: "მოკლევადიანი სესხები", type: "liability" as const, parentCode: "3000", category: "ვალდებულება" },
            { code: "3300", name: "საგადასახადო ვალდებულებები", type: "liability" as const, parentCode: "3000", category: "ვალდებულება" },
            { code: "3400", name: "დარიცხული ვალდებულებები", type: "liability" as const, parentCode: "3000", category: "ვალდებულება" },

            // 4000 - Long-term Liabilities
            { code: "4000", name: "გრძელვადიანი ვალდებულებები", type: "liability" as const, category: "ვალდებულება" },
            { code: "4100", name: "გრძელვადიანი სასესხო ვალდებულებები", type: "liability" as const, parentCode: "4000", category: "ვალდებულება" },
            { code: "4200", name: "გადავადებული გადასახადები და სხვა გრძელვადიანი ვალდებულებები", type: "liability" as const, parentCode: "4000", category: "ვალდებულება" },
            { code: "4400", name: "გადავადებული შემოსავალი", type: "liability" as const, parentCode: "4000", category: "ვალდებულება" },

            // 5000 - Equity
            { code: "5000", name: "საკუთარი კაპიტალი", type: "equity" as const, category: "კაპიტალი" },
            { code: "5100", name: "საწესდებო კაპიტალი", type: "equity" as const, parentCode: "5000", category: "კაპიტალი" },
            { code: "5300", name: "მოგება-ზარალი", type: "equity" as const, parentCode: "5000", category: "კაპიტალი" },
            { code: "5400", name: "რეზერვები და ფინანსირება", type: "equity" as const, parentCode: "5000", category: "კაპიტალი" },
            { code: "5500", name: "ფინანსური და საგადასახადო შემოსავლის სხვაობა", type: "equity" as const, parentCode: "5000", accountClass: "პერიოდის მოგება/ზარალი", category: "კაპიტალი" },

            // 6000 - Operating Revenue
            { code: "6000", name: "საოპერაციო შემოსავალი", type: "revenue" as const, category: "შემოსავალი" },
            { code: "6100", name: "საოპერაციო შემოსავალი", type: "revenue" as const, parentCode: "6000", category: "შემოსავალი" },
            { code: "6200", name: "შემოსავალი საგადასახადო", type: "revenue" as const, parentCode: "6000", category: "შემოსავალი" },

            // 7000 - Operating Expenses
            { code: "7000", name: "საოპერაციო ხარჯები", type: "expense" as const, category: "ხარჯი" },
            { code: "7100", name: "რეალიზებული პროდუქციის თვითღირებულება (წარმოებისთვის)", type: "expense" as const, parentCode: "7000", category: "თვითღირებულება" },
            { code: "7200", name: "რეალიზებული საქონლის თვითღირებულება (სავაჭრო კომპანიებისთვის)", type: "expense" as const, parentCode: "7000", category: "თვითღირებულება" },
            { code: "7300", name: "მიწოდების ხარჯები", type: "expense" as const, parentCode: "7000", category: "ხარჯი" },
            { code: "7400", name: "საერთო-ადმინისტრაციული ხარჯები", type: "expense" as const, parentCode: "7000", category: "ხარჯი" },

            // 8000 - Non-operating Income and Expenses
            { code: "8000", name: "არასაოპერაციო შემოსავლები და ხარჯები", type: "expense" as const, category: "სხვა შემოსავლები / ხარჯები" },
            { code: "8100", name: "არასაოპერაციო შემოსავალი", type: "revenue" as const, parentCode: "8000", category: "სხვა შემოსავლები / ხარჯები" },
            { code: "8200", name: "არასაოპერაციო ხარჯები", type: "expense" as const, parentCode: "8000", category: "სხვა შემოსავლები / ხარჯები" },

            // 9000 - Special Income and Expenses
            { code: "9000", name: "განსაკუთრებული შემოსავლები და ხარჯები", type: "expense" as const, category: "სხვა შემოსავლები / ხარჯები" },
            { code: "9100", name: "განსაკუთრებული შემოსავლები და ხარჯები", type: "expense" as const, parentCode: "9000", category: "სხვა შემოსავლები / ხარჯები" },
            { code: "9200", name: "სხვა ხარჯები", type: "expense" as const, parentCode: "9000", category: "სხვა შემოსავლები / ხარჯები" },

            // Auxiliary accounts
            { code: "A000", name: "მომწოდებლებთან ანგარიშსწორების შუალედური ანგარიში", type: "liability" as const, accountClass: "ზოგადი", category: "დამხმარე" },
            { code: "B000", name: "მყიდველებთან ანგარიშსწორების შუალედური ანგარიში", type: "asset" as const, accountClass: "ზოგადი", category: "დამხმარე" },
            { code: "C000", name: "კონვერტაცია", type: "asset" as const, accountClass: "ზოგადი", category: "დამხმარე" },
            { code: "F000", name: "ფილიალებს შორის გადაადგილების შუალედური ანგარიში", type: "asset" as const, accountClass: "ზოგადი", category: "დამხმარე" },
            { code: "I000", name: "შუალედური ანგარიში ინკასაციისთვის", type: "asset" as const, accountClass: "ზოგადი", category: "დამხმარე" },
            { code: "O000", name: "შუალედური ანგარიში სხვა გატარებებისთვის", type: "asset" as const, accountClass: "ზოგადი", category: "დამხმარე" },
            { code: "P000", name: "POS ტერმინალის შუალედური ანგარიში", type: "asset" as const, accountClass: "ექვაირინგი", category: "დამხმარე" },
        ];

        // First pass: create all accounts without parent relationships
        for (const account of defaults) {
            await db.insert(accounts).values({
                clientId,
                code: account.code,
                name: account.name,
                type: account.type,
                accountClass: account.accountClass || "",
                category: account.category || "",
                isActive: true,
            });
        }

        // Second pass: establish parent-child relationships
        for (const account of defaults) {
            if (account.parentCode) {
                // Find parent account
                const parentAccount = await db
                    .select({ id: accounts.id })
                    .from(accounts)
                    .where(and(eq(accounts.clientId, clientId), eq(accounts.code, account.parentCode)));

                if (parentAccount.length > 0) {
                    // Update child account with parent ID
                    await db.update(accounts)
                        .set({ parentId: parentAccount[0].id })
                        .where(and(eq(accounts.clientId, clientId), eq(accounts.code, account.code)));
                }
            }
        }

        console.log(`✅ Seeded ${defaults.length} default accounts for client ${clientId}`);
        return defaults.length;
    } catch (error) {
        console.error(`Failed to seed default accounts for client ${clientId}:`, error);
        throw error;
    }
}
