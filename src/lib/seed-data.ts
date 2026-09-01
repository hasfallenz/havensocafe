import { prisma } from "@/lib/db";

export async function ensureDatabaseSeeded() {
  try {
    const categoryCount = await prisma.category.count();
    const menuItemCount = await prisma.menuItem.count();

    if (categoryCount > 0 && menuItemCount > 0) {
      return; // Already seeded
    }

    console.log("Database empty, auto-seeding initial Havenso Cafe menu and tables...");

    // 1. Seed Tables (A1 to A10) if empty
    const tableCount = await prisma.table.count();
    if (tableCount === 0) {
      const tableData = [
        { tableNumber: "A1", capacity: 2, location: "Indoor Main", status: "AVAILABLE" },
        { tableNumber: "A2", capacity: 2, location: "Indoor Main", status: "AVAILABLE" },
        { tableNumber: "A3", capacity: 4, location: "Indoor Window", status: "AVAILABLE" },
        { tableNumber: "A4", capacity: 4, location: "Indoor Window", status: "AVAILABLE" },
        { tableNumber: "A5", capacity: 4, location: "Indoor Central", status: "AVAILABLE" },
        { tableNumber: "A6", capacity: 4, location: "Indoor Central", status: "AVAILABLE" },
        { tableNumber: "A7", capacity: 6, location: "Indoor Lounge", status: "AVAILABLE" },
        { tableNumber: "A8", capacity: 6, location: "Indoor Lounge", status: "AVAILABLE" },
        { tableNumber: "A9", capacity: 8, location: "VIP Glasshouse", status: "AVAILABLE" },
        { tableNumber: "A10", capacity: 8, location: "VIP Glasshouse", status: "AVAILABLE" },
      ];

      for (const t of tableData) {
        await prisma.table.upsert({
          where: { tableNumber: t.tableNumber },
          update: {},
          create: {
            tableNumber: t.tableNumber,
            capacity: t.capacity,
            location: t.location,
            status: t.status,
            qrCode: `/customer?table=${t.tableNumber}`,
          },
        });
      }
    }

    // 2. Seed Categories
    const catCoffee = await prisma.category.upsert({
      where: { slug: "coffee" },
      update: {},
      create: { name: "Coffee", slug: "coffee", displayOrder: 1, isActive: true },
    });

    const catNonCoffee = await prisma.category.upsert({
      where: { slug: "non-coffee" },
      update: {},
      create: { name: "Non-Coffee", slug: "non-coffee", displayOrder: 2, isActive: true },
    });

    const catTea = await prisma.category.upsert({
      where: { slug: "tea" },
      update: {},
      create: { name: "Tea", slug: "tea", displayOrder: 3, isActive: true },
    });

    const catFood = await prisma.category.upsert({
      where: { slug: "food" },
      update: {},
      create: { name: "Food", slug: "food", displayOrder: 4, isActive: true },
    });

    // 3. Seed 20 Canonical Menu Items
    const menuItems = [
      // Coffee
      {
        categoryId: catCoffee.id,
        name: "Havenso Cold Brew Orange",
        slug: "havenso-cold-brew-orange",
        description: "18-hour single origin Arabica cold extraction layered with fresh Navel orange slice and botanical tonic.",
        price: 32000,
        imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 4,
        ingredients: "Single Origin Cold Brew, Fresh Orange Slice, Citrus Tonic",
        allergens: "None",
        recommendationTags: JSON.stringify(["Signature", "Best Seller", "Cold"]),
      },
      {
        categoryId: catCoffee.id,
        name: "Aren Coconut Latte",
        slug: "aren-coconut-latte",
        description: "Double shot ristretto with artisanal organic Aren palm sugar and silky steamed coconut milk.",
        price: 28000,
        imageUrl: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 5,
        ingredients: "Double Ristretto, Coconut Milk, Organic Aren Sugar",
        allergens: "Coconut",
        recommendationTags: JSON.stringify(["Popular", "Sweet & Creamy"]),
      },
      {
        categoryId: catCoffee.id,
        name: "Iced Salted Caramel Latte",
        slug: "iced-salted-caramel-latte",
        description: "Signature espresso blend with fresh Hokkaido-style milk and sea-salted butterscotch caramel drizzle.",
        price: 34000,
        imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 5,
        ingredients: "Espresso, Fresh Milk, Sea Salt Caramel",
        allergens: "Dairy",
        recommendationTags: JSON.stringify(["Best Seller", "Sweet"]),
      },
      {
        categoryId: catCoffee.id,
        name: "Caffè Americano",
        slug: "caffe-americano",
        description: "Classic rich double espresso extracted on pure mountain spring water. Bold and aromatic.",
        price: 24000,
        imageUrl: "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 3,
        ingredients: "Double Espresso, Hot or Iced Water",
        allergens: "None",
        recommendationTags: JSON.stringify(["Classic", "Zero Sugar"]),
      },
      {
        categoryId: catCoffee.id,
        name: "Spanish Latte",
        slug: "spanish-latte",
        description: "Rich espresso combined with sweetened condensed milk and micro-foamed whole milk.",
        price: 30000,
        imageUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 4,
        ingredients: "Espresso, Condensed Milk, Fresh Milk",
        allergens: "Dairy",
        recommendationTags: JSON.stringify(["Comfort Drink"]),
      },
      {
        categoryId: catCoffee.id,
        name: "Espresso Romano",
        slug: "espresso-romano",
        description: "Traditional Italian double shot espresso served with a twist of candied lemon rind.",
        price: 22000,
        imageUrl: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 3,
        ingredients: "Double Espresso, Fresh Lemon Twist",
        allergens: "None",
        recommendationTags: JSON.stringify(["Strong", "Citrus Note"]),
      },

      // Non-Coffee
      {
        categoryId: catNonCoffee.id,
        name: "Matcha Cloud Latte",
        slug: "matcha-cloud-latte",
        description: "First-harvest ceremonial Uji matcha layered over sweetened milk and topped with sea-salt cloud foam.",
        price: 35000,
        imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 5,
        ingredients: "Uji Ceremonial Matcha, Fresh Milk, Sea Salt Cold Foam",
        allergens: "Dairy",
        recommendationTags: JSON.stringify(["Signature", "Green Tea"]),
      },
      {
        categoryId: catNonCoffee.id,
        name: "Belgian Dark Chocolate 70%",
        slug: "belgian-dark-chocolate",
        description: "Rich melted 70% Callebaut Belgian dark chocolate with steamed whole milk and cocoa dust.",
        price: 32000,
        imageUrl: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 4,
        ingredients: "Callebaut 70% Dark Chocolate, Fresh Milk, Cocoa Powder",
        allergens: "Dairy",
        recommendationTags: JSON.stringify(["Rich", "Comfort"]),
      },
      {
        categoryId: catNonCoffee.id,
        name: "Strawberry Pistachio Bliss",
        slug: "strawberry-pistachio-bliss",
        description: "Artisan house-made strawberry purée layered with roasted pistachio oat milk and crushed nuts.",
        price: 38000,
        imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 5,
        ingredients: "Fresh Strawberry Compote, Pistachio Oat Milk, Crushed Pistachio",
        allergens: "Tree Nuts (Pistachio)",
        recommendationTags: JSON.stringify(["Chef Pick", "Fruity"]),
      },
      {
        categoryId: catNonCoffee.id,
        name: "Taro Velveteen",
        slug: "taro-velveteen",
        description: "Real purple yam paste infused with Madagascan vanilla and velvety textured steamed milk.",
        price: 28000,
        imageUrl: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 4,
        ingredients: "Premium Taro Paste, Fresh Milk, Vanilla",
        allergens: "Dairy",
        recommendationTags: JSON.stringify(["Smooth & Sweet"]),
      },

      // Tea
      {
        categoryId: catTea.id,
        name: "Lychee Peach Blossom Tea",
        slug: "lychee-peach-blossom-tea",
        description: "Hand-picked green tea shaken with fragrant sweet lychees, peach nectar, and edible blossoms.",
        price: 28000,
        imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 3,
        ingredients: "Jasmine Green Tea, Lychee Fruit, Peach Nectar",
        allergens: "None",
        recommendationTags: JSON.stringify(["Refreshing", "Fruity"]),
      },
      {
        categoryId: catTea.id,
        name: "Earl Grey Lavender Infusion",
        slug: "earl-grey-lavender-infusion",
        description: "Fine black tea scented with cold-pressed Italian bergamot and soothing French organic lavender blossoms.",
        price: 26000,
        imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 3,
        ingredients: "Ceylon Black Tea, Bergamot Oil, Lavender Buds, Wild Honey",
        allergens: "None",
        recommendationTags: JSON.stringify(["Aromatic", "Relaxing"]),
      },
      {
        categoryId: catTea.id,
        name: "Lemongrass Mint Cooler",
        slug: "lemongrass-mint-cooler",
        description: "Crushed fresh lemongrass stalk and spearmint leaves brewed with pure honey and sparkling soda.",
        price: 25000,
        imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 3,
        ingredients: "Fresh Lemongrass, Garden Mint, Wild Honey, Soda Water",
        allergens: "None",
        recommendationTags: JSON.stringify(["Detox", "Cold"]),
      },

      // Food
      {
        categoryId: catFood.id,
        name: "Artisan Butter Croissant",
        slug: "artisan-butter-croissant",
        description: "Authentic French croissant baked fresh every morning with 100% Normandy cultured butter. Crisp, golden, flaky layers.",
        price: 25000,
        imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 6,
        ingredients: "Wheat Flour, Normandy Butter, Milk, Sugar, Yeast",
        allergens: "Gluten, Dairy",
        recommendationTags: JSON.stringify(["Best Seller", "Bakery Fresh"]),
      },
      {
        categoryId: catFood.id,
        name: "Truffle Parmesan Fries",
        slug: "truffle-parmesan-fries",
        description: "Crispy shoestring fries tossed in white Alba truffle oil, aged Parmigiano-Reggiano, and fresh chopped rosemary.",
        price: 35000,
        imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f3908594?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 8,
        ingredients: "Potatoes, White Truffle Oil, Parmigiano-Reggiano, Rosemary, Garlic Aioli",
        allergens: "Dairy, Eggs",
        recommendationTags: JSON.stringify(["Popular Snack", "Savory"]),
      },
      {
        categoryId: catFood.id,
        name: "Smoked Beef & Gruyere Panini",
        slug: "smoked-beef-gruyere-panini",
        description: "Artisanal toasted sourdough bread packed with oak-smoked beef brisket, melted Gruyere cheese, and caramelized onion relish.",
        price: 48000,
        imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 10,
        ingredients: "Sourdough, Smoked Beef, Gruyere Cheese, Caramelized Onions, Dijon Mustard",
        allergens: "Gluten, Dairy",
        recommendationTags: JSON.stringify(["Chef Pick", "Hearty Meal"]),
      },
      {
        categoryId: catFood.id,
        name: "Pistachio Basque Burnt Cheesecake",
        slug: "pistachio-basque-burnt-cheesecake",
        description: "Rich, caramelized crust with a molten gooey center infused with pure Sicilian roasted pistachio paste.",
        price: 42000,
        imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 4,
        ingredients: "Cream Cheese, Heavy Cream, Eggs, Pistachio Paste, Sugar",
        allergens: "Dairy, Eggs, Tree Nuts",
        recommendationTags: JSON.stringify(["Signature Dessert", "Best Seller"]),
      },
      {
        categoryId: catFood.id,
        name: "Aglio Olio Smoked Duck Pasta",
        slug: "aglio-olio-smoked-duck",
        description: "Al dente spaghetti tossed with golden garlic confit, bird's eye chili, cold-pressed olive oil, and seared tender smoked duck.",
        price: 52000,
        imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 12,
        ingredients: "Spaghetti, Smoked Duck Breast, Extra Virgin Olive Oil, Garlic, Chili, Parsley",
        allergens: "Gluten",
        recommendationTags: JSON.stringify(["Main Course", "Spicy"]),
      },
      {
        categoryId: catFood.id,
        name: "Japanese Beef Yakiniku Rice Bowl",
        slug: "japanese-beef-yakiniku-rice-bowl",
        description: "Tender sliced US shortplate beef simmered in sweet savory mirin-soy glaze, served over steaming Koshihikari rice and onsen egg.",
        price: 48000,
        imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 10,
        ingredients: "US Beef Shortplate, Japanese Rice, Onsen Egg, Scallions, Sesame, Teriyaki Sauce",
        allergens: "Soy, Eggs, Sesame",
        recommendationTags: JSON.stringify(["Best Seller", "Hearty Meal"]),
      },
      {
        categoryId: catFood.id,
        name: "Crispy Calamari with Tartar Dip",
        slug: "crispy-calamari-tartar-dip",
        description: "Tender squid rings coated in golden spiced panko crumbs, flash-fried to crisp perfection and served with house tartar dip.",
        price: 36000,
        imageUrl: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?q=80&w=800&auto=format&fit=crop",
        isAvailable: true,
        preparationTime: 7,
        ingredients: "Squid Rings, Panko, Lemon, House Tartar Sauce, Parsley",
        allergens: "Seafood, Eggs, Gluten",
        recommendationTags: JSON.stringify(["Popular Snack", "Crispy"]),
      },
    ];

    for (const item of menuItems) {
      await prisma.menuItem.upsert({
        where: { slug: item.slug },
        update: {},
        create: item,
      });
    }

    console.log("Database auto-seeded successfully with 20 items!");
  } catch (e) {
    console.error("Auto-seeding error:", e);
  }
}
