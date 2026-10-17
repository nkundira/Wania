import { execute, query } from './db.js';

function lesson(title, content, duration = 15) {
  return { title, content, duration };
}

const baristaModules = [
  {
    title: 'Coffee Foundations',
    lessons: [
      lesson('Introduction to Coffee', `# Introduction to Coffee

## Learning Objectives
- Understand what coffee is and why it matters in hospitality
- Identify the key stages from seed to cup
- Recognize the role of a professional barista

## What Is Coffee?
Coffee is a beverage brewed from the roasted seeds (beans) of plants belonging to the genus *Coffea*. Globally, it is the second most traded commodity after crude oil, and it sits at the heart of cafe culture, hotel breakfast service, and countless hospitality operations.

## The Seed-to-Cup Journey
Every cup of coffee passes through seven key stages:

1. **Cultivation** — Coffee cherries grow on shrubs in tropical regions
2. **Harvesting** — Cherries are picked when ripe
3. **Processing** — Beans are extracted from the fruit
4. **Drying & Milling** — Moisture is removed and parchment is stripped
5. **Export & Storage** — Green coffee is shipped worldwide
6. **Roasting** — Beans develop flavor and aroma
7. **Brewing** — Ground coffee is combined with hot water to extract flavor

## The Role of a Barista
A barista is more than a coffee maker. A professional barista:
- Operates and maintains espresso equipment
- Understands coffee science and extraction theory
- Delivers consistent, high-quality beverages
- Provides excellent customer service
- Maintains hygiene and food safety standards

## Why It Matters in Hospitality
In hotels, restaurants, and cafes, coffee is often the first impression a guest receives. A poorly made espresso can define a guest's entire perception of a venue. Consistency, quality, and presentation are essential.

## Summary
Coffee is a complex product with a long journey from farm to cup. Understanding this journey helps every hospitality professional appreciate and improve the beverages they serve.

## Review Questions
1. Name the seven stages of the coffee journey.
2. What qualities define a professional barista?
3. Why is coffee quality important in hospitality settings?`, 15),
      lesson('Coffee History and Origins', `# Coffee History and Origins

## Learning Objectives
- Trace the historical discovery and spread of coffee
- Identify major coffee-growing regions
- Understand how history shapes modern coffee culture

## The Legend of Kaldi
The most popular origin story places coffee's discovery in Ethiopia around the 9th century. A goatherd named Kaldi noticed his goats became energetic after eating red berries from a certain shrub. He brought the berries to a local monastery, where a monk brewed a drink that helped him stay awake during evening prayers.

## Spread Through the Islamic World
By the 15th century, coffee was being cultivated in Yemen. Sufi monks used it to stay alert during nighttime devotions. Coffee houses (*qahveh khaneh*) emerged across the Ottoman Empire, becoming centers of intellectual exchange, music, and socializing.

## Coffee in Europe
Coffee arrived in Europe in the 17th century. Venice was among the first cities to embrace it. Coffeehouses became known as "penny universities" because for the price of a coffee, you could engage in stimulating conversation. The beverage fueled the Enlightenment and commercial revolution.

## Modern Coffee Culture
The second wave (Starbucks-era) popularized espresso-based drinks globally. The third wave treats coffee as an artisanal product, emphasizing single-origin beans, light roasts, and transparency in sourcing. Today, the fourth wave integrates technology and sustainability.

## Major Growing Regions
Coffee grows in the "Bean Belt" between the Tropics of Cancer and Capricorn:

- **Central & South America** — Brazil (largest producer), Colombia, Guatemala, Costa Rica
- **Africa** — Ethiopia (birthplace), Kenya, Rwanda, Tanzania
- **Asia & Pacific** — Vietnam (Robusta leader), Indonesia, India

## Summary
Coffee's journey from Ethiopian legend to global commodity has shaped cultures, economies, and social institutions. Understanding this history enriches every cup.

## Review Questions
1. Who is traditionally credited with coffee's discovery and where?
2. What were Ottoman coffee houses used for?
3. Name three major coffee-growing regions.`, 15),
      lesson('Arabica, Robusta, and Liberica', `# Arabica, Robusta, and Liberica

## Learning Objectives
- Differentiate between the three main commercial coffee species
- Understand flavor profiles and ideal uses for each
- Recognize how species affects beverage quality

## Arabica (*Coffea arabica*)
Arabica accounts for approximately **60-70%** of global production. It grows at higher altitudes (600-2000m) and is more sensitive to pests and climate.

**Flavor profile:** Smooth, complex, sweeter with higher acidity. Notes of fruit, sugar, and berries. Lower caffeine content (approx. 1.2%).

**Best for:** Specialty espresso, filter coffee, premium cafe beverages.

## Robusta (*Coffea canephora*)
Robusta accounts for about **30-40%** of production. It thrives at lower altitudes and is hardier against disease.

**Flavor profile:** Stronger, harsher, more bitter. Earthy or grain-like notes. Higher caffeine (approx. 2.2%). More crema when extracted as espresso.

**Best for:** Espresso blends (for crema), instant coffee, traditional Italian-style espresso.

## Liberica (*Coffea liberica*)
Liberica is a rare species, mostly grown in Malaysia and the Philippines (less than 1% of global production).

**Flavor profile:** Unique, floral, slightly woody, with a full body. Very large, irregular beans.

**Best for:** Niche specialty markets and regional specialties.

## Blending Strategies
Many commercial espresso blends combine Arabica (for sweetness and complexity) with Robusta (for body and crema). A typical blend might be 80% Arabica / 20% Robusta.

## Summary
Arabica delivers sweetness and complexity, Robusta provides strength and crema, and Liberica offers uniqueness. Choosing the right species (or blend) is fundamental to beverage design.

## Review Questions
1. What percentage of global coffee production is Arabica?
2. Why might a barista include Robusta in an espresso blend?
3. How does caffeine content differ between Arabica and Robusta?`, 15),
      lesson('Coffee Farming and Harvesting', `# Coffee Farming and Harvesting

## Learning Objectives
- Understand coffee plant cultivation requirements
- Learn how coffee cherries are harvested
- Recognize quality implications of harvest methods

## The Coffee Plant
Coffee grows as shrubs or small trees. The most commercially important species:
- **Arabica:** Prefers shade, high altitude (600-2000m), temperatures 15-24°C
- **Robusta:** Tolerates sun, lower altitude, temperatures 22-30°C

## Growth Cycle
A coffee tree takes **3-5 years** to produce its first crop:
1. **Flowering** — White jasmine-scented blossoms appear after rains
2. **Cherry development** — Green cherries mature over 6-9 months
3. **Ripening** — Cherries turn yellow, then deep red
4. **Harvest** — Only ripe cherries should be picked

## Harvesting Methods
### Selective Picking
Workers hand-pick only ripe cherries, returning multiple times to the same tree. Labor-intensive but highest quality. Used for specialty and Arabica coffees.

### Strip Picking
All cherries are stripped from the branch at once — ripe and unripe together. Faster but lower quality. Common for Robusta and mechanical harvesting.

### Mechanical Harvesting
Machines shake trees to dislodge cherries. Used on flat terrain in large-scale operations. Efficiency comes at the cost of selectivity.

## Quality Implications
Underripe cherries produce astringent, sour flavors. Overripe cherries can ferment and develop off-flavors. Selective picking is a cornerstone of specialty coffee quality.

## Summary
Coffee farming requires specific climatic conditions, and harvesting method directly impacts cup quality. Selective hand-picking remains the gold standard for specialty coffee.

## Review Questions
1. What climatic conditions does Arabica prefer?
2. Compare selective and strip picking.
3. Why does harvest method affect flavor?`, 15),
      lesson('Wet and Dry Coffee Processing', `# Wet and Dry Coffee Processing

## Learning Objectives
- Compare washed, natural, and honey processing methods
- Understand how processing affects flavor
- Choose the right process for desired cup characteristics

## Why Processing Matters
Processing removes the fruit layers from the coffee seed. The method used dramatically influences the final flavor.

## Washed (Wet) Process
1. Cherries are depulped within hours of harvest
2. Beans ferment in water tanks for 12-72 hours to break down mucilage
3. Beans are washed thoroughly
4. Dried on raised beds or mechanical dryers

**Flavor:** Clean, bright acidity, clear origin character. Highlights the bean's inherent qualities.

## Natural (Dry) Process
1. Whole cherries are spread on drying patios or raised beds
2. Dried for 2-6 weeks with regular turning
3. Fruit is mechanically removed after drying

**Flavor:** Full-bodied, fruity, wine-like, sometimes berry or tropical fruit notes.

## Honey Process
1. Cherries are depulped but some mucilage is left on the bean during drying
2. Amount of mucilage varies (yellow, red, black honey)

**Flavor:** Between washed and natural — balanced sweetness with some fruit notes and body.

## Summary
Washed coffees are clean and bright, naturals are fruity and full-bodied, and honey process sits between them. The choice of process is a deliberate flavor decision.

## Review Questions
1. Describe the three main processing methods.
2. How does washed processing differ from natural in flavor?
3. What is honey processing?`, 15),
      lesson('Green Coffee Storage', `# Green Coffee Storage

## Learning Objectives
- Understand green coffee quality degradation factors
- Learn proper storage conditions
- Recognize the impact of storage on cup quality

## What Is Green Coffee?
Green coffee is unroasted coffee — the dried, processed seed ready for export and roasting. Proper storage preserves the quality that farmers and processors worked to create.

## Enemies of Green Coffee
- **Heat** — Accelerates chemical degradation. Ideal: below 20°C
- **Humidity** — Moisture above 12% encourages mold. Ideal: 50-60% RH
- **Light** — UV degrades chlorophyll and flavors
- **Oxygen** — Causes staling and rancidity
- **Odors** — Green coffee absorbs ambient smells readily
- **Pests** — Insects and rodents can infest improperly stored coffee

## Best Practices
1. Store in cool, dry, dark areas
2. Use GrainPro or hermetic bags for premium lots
3. Stack bags on pallets, not on the floor
4. Maintain FIFO (first in, first out) rotation
5. Keep storage areas clean and pest-free
6. Target moisture content of 10-12%

## Shelf Life
Green coffee is best used within **6-12 months** of harvest. Older coffee loses acidity and develops flat, papery flavors.

## Summary
Proper green coffee storage is essential for delivering quality in the cup. Control temperature, humidity, light, and odors, and rotate stock regularly.

## Review Questions
1. List the main enemies of green coffee.
2. What moisture content should green coffee be stored at?
3. Why is FIFO rotation important?`, 12),
      lesson('Coffee Roasting and Roast Levels', `# Coffee Roasting and Roast Levels

## Learning Objectives
- Understand what happens during roasting
- Differentiate roast levels and their characteristics
- Describe roast development to guests

## The Roasting Process
Roasting transforms green coffee through heat application:
1. **Drying phase** (up to ~150°C) — Moisture evaporates, beans turn yellow/tan
2. **Maillard reactions** (150-200°C) — Sugars and amino acids react, developing hundreds of flavor compounds
3. **Caramelization** (~170°C+) — Sugars caramelize, creating sweetness and body
4. **First crack** (~196°C) — Beans audibly crack, expand, and turn light brown
5. **Development** — Time after first crack develops deeper flavors
6. **Second crack** (~224°C) — Cell structures break, oils appear on surface

## Roast Levels
### Light Roast
- Stopped shortly after first crack
- Light brown, no oil on surface
- Highest acidity, most origin character
- Delicate floral, fruit, tea-like notes
- Best for: filter, pour-over, single origin espresso

### Medium Roast
- Between first and second crack
- Balanced acidity and body
- Caramel sweetness, chocolate notes
- Most versatile — suits most brewing methods

### Medium-Dark Roast
- Closer to second crack
- Richer body, less acidity
- Toasted nut, dark chocolate, spice

### Dark Roast
- Into or past second crack
- Oily surface, dark brown/black
- Smoky, bittersweet, char notes
- Origin character is mostly masked

## Summary
Roasting is where coffee develops its characteristic flavors. Understanding roast levels allows baristas to recommend the right coffee and dial in appropriate extractions.

## Review Questions
1. What is "first crack"?
2. How does acidity change from light to dark roast?
3. Which roast level best preserves origin character?`, 18),
      lesson('Coffee Equipment and Grinder Types', `# Coffee Equipment and Grinder Types

## Learning Objectives
- Identify essential cafe equipment
- Compare burr and blade grinders
- Understand why grinder quality matters

## Essential Cafe Equipment
- **Espresso machine** — Pressurized brewing system
- **Grinder** — Most critical piece of equipment for quality
- **Scale** — For dosing accuracy (0.1g resolution ideal)
- **Tamper** — For compressing coffee in the portafilter
- **Knock box** — For disposing of spent pucks
- **Pitcher** — Stainless steel for milk steaming
- **Thermometer** — For milk temperature accuracy
- **Cleaning supplies** — Group head brushes, detergent, cloths

## Grinder Types
### Blade Grinders
- Use spinning blades to chop beans
- Inconsistent particle size
- Heat generation can damage flavors
- Not recommended for espresso

### Burr Grinders (Flat)
- Two parallel burrs grind beans between them
- More consistent than blade grinders
- Good for filter and espresso

### Burr Grinders (Conical)
- Inner and outer cone-shaped burrs
- Less heat generation, quieter
- Wide grind range

## Why Grind Matters
Grind size controls extraction rate. Finer grinds = more surface area = faster extraction. Coarser grinds = slower extraction. An inconsistent grind leads to simultaneous over- and under-extraction.

## Summary
The grinder is the single most important equipment investment for coffee quality. Burr grinders deliver the consistency required for professional results.

## Review Questions
1. Why is the grinder more important than the espresso machine for quality?
2. Compare burr and blade grinders.
3. Name three essential pieces of cafe equipment.`, 15),
      lesson('Espresso Machine Components', `# Espresso Machine Components

## Learning Objectives
- Identify all major espresso machine parts
- Understand what each component does
- Perform basic machine operations

## Major Components
### Group Head
Where portafilter locks in. Water from the boiler passes through here. Temperature stability here is critical.

### Portafilter
Holds the coffee basket. Has a handle and spouts. The basket is a metal cylinder with precision-drilled holes.

### Boiler(s)
Heats water for brewing and steaming:
- **Single boiler** — One boiler for both (home machines)
- **Heat exchanger** — One brew boiler + steam from heat exchange
- **Dual boiler** — Separate brew and steam boilers (commercial standard)

### Steam Wand
Delivers pressurized steam for milk texturing. Has a tip with 1-4 holes.

### Pump
Creates the 9 bars of pressure needed for extraction. Vibratory (home) or rotary (commercial).

### Drip Tray
Catches water and coffee spills.

## Operating an Espresso Machine
1. Turn on and allow 15-30 min warm-up
2. Purge the group head
3. Dose and tamp coffee in the portafilter
4. Lock in and start extraction immediately
5. Time and weigh the shot
6. Purge and wipe the steam wand after use

## Summary
Understanding machine components is essential for operation, troubleshooting, and maintenance. Each part plays a role in producing consistent espresso.

## Review Questions
1. What is the function of the group head?
2. What are the two main boiler configurations in commercial machines?
3. Why is warm-up time important?`, 15),
      lesson('Grinder Calibration', `# Grinder Calibration

## Learning Objectives
- Learn the process of dialing in a grinder
- Understand the relationship between grind size and extraction time
- Maintain consistent grind quality

## What Is Calibration?
Calibration (dialing in) is the process of adjusting grind size to achieve the correct extraction time and yield for a given dose.

## Step-by-Step Calibration
### Step 1: Establish a Starting Point
- Set dose to 18g (for a double)
- Set grind to a medium-fine setting
- Brew and time the shot

### Step 2: Target Parameters
- **Dose:** 18g (plus or minus 0.3g)
- **Yield:** 36g (1:2 ratio)
- **Time:** 25-30 seconds (including pre-infusion)

### Step 3: Adjust
- **Shot too fast (<22s), thin/tart:** Grind finer
- **Shot too slow (>35s), drips:** Grind coarser
- Adjust in small increments

### Step 4: Taste
- **Sour, thin, watery:** Under-extracted, grind finer
- **Bitter, harsh, drying:** Over-extracted, grind coarser
- **Balanced, sweet, pleasant:** Correctly extracted

## Daily Calibration
Grinders need re-dialing:
- First shot of the day (burrs are cold)
- After changing coffee bags
- When humidity changes significantly
- After cleaning

## Purging
After changing grind setting, purge 5-10g to discard stale grounds stuck in the burrs.

## Summary
Grinder calibration is a daily practice. Target 25-30 seconds for a 1:2 brew ratio, adjust based on taste, and purge after changes.

## Review Questions
1. What is the standard double espresso dose and yield?
2. How do you fix a shot that tastes sour?
3. Why must you purge the grinder after adjusting?`, 18),
    ]
  },
  {
    title: 'Espresso Mastery',
    lessons: [
      lesson('Dose, Yield, and Brew Ratios', `# Dose, Yield, and Brew Ratios

## Learning Objectives
- Understand the espresso golden ratio
- Measure dose and yield accurately
- Adjust brew ratios for different styles

## Key Measurements
- **Dose** — Weight of dry coffee in the basket (typically 16-20g)
- **Yield** — Weight of liquid espresso in the cup
- **Time** — Duration of extraction (typically 25-30s)
- **Brew ratio** — Relationship between dose and yield

## Standard Ratios
- **Espresso (traditional):** 1:1.5 to 1:2 (18g dose gives 27-36g yield)
- **Ristretto:** 1:1 to 1:1.5 (18g dose gives 18-27g yield)
- **Lungo:** 1:2.5 to 1:3 (18g dose gives 45-54g yield)
- **Americano base:** 1:2 (18g dose gives 36g yield)

## Why Ratios Matter
The brew ratio determines strength and intensity. A tighter ratio concentrates flavors. A longer ratio dilutes them. Consistency ensures every guest receives the same experience.

## Measuring Technique
1. Place cup on scale, tare to zero
2. Start extraction
3. Stop when target yield is reached (by weight, not volume)
4. Record time

## Summary
Brew ratios are the foundation of espresso recipe design. Weigh everything, target a 1:2 ratio as a starting point, and adjust based on taste.

## Review Questions
1. What is the standard espresso brew ratio?
2. How does a ristretto differ from a lungo?
3. Why should you measure by weight, not volume?`, 15),
      lesson('Grinding, Distribution, and Tamping', `# Grinding, Distribution, and Tamping

## Learning Objectives
- Execute proper puck preparation
- Use distribution tools for even extraction
- Apply consistent tamping technique

## Puck Preparation Steps
### 1. Dose
Weigh coffee accurately (plus or minus 0.3g). Inconsistent dosing is the #1 cause of inconsistency.

### 2. Distribute (Before Tamping)
Ground coffee settles unevenly in the basket. Distribution ensures even density:
- **Finger method:** Level coffee with your finger across the basket
- **Weiss Distribution Technique (WDT):** Stir with fine needles to break clumps
- **Distribution tool:** A leveling device that spins on the coffee surface

Even distribution prevents channeling — water finding paths of least resistance.

### 3. Tamp
Apply firm, level pressure to compress the coffee into a compact puck.
- **Pressure:** Approximately 15-30 lbs
- **Level:** The tamper must be perfectly parallel to the basket
- **Consistency:** Same pressure every time

### 4. Clean the Rim
Wipe coffee grounds from the basket rim to ensure a proper seal.

## Common Mistakes
- Inconsistent dosing
- Uneven distribution (causes channeling)
- Tamping at an angle
- Over-tamping or under-tamping

## Summary
Great espresso starts with the puck. Accurate dosing, thorough distribution, and level tamping create the uniform resistance needed for even extraction.

## Review Questions
1. What is channeling and how does it affect extraction?
2. Describe proper tamping technique.
3. Why is distribution important before tamping?`, 18),
      lesson('Espresso Extraction and Timing', `# Espresso Extraction and Timing

## Learning Objectives
- Understand the phases of espresso extraction
- Time shots correctly
- Diagnose extraction problems from timing and taste

## Phases of Extraction
When hot water contacts the coffee puck:
1. **Pre-infusion** (0-5s) — Low-pressure wetting of the puck
2. **Early extraction** — Sour, bright compounds dissolve first
3. **Mid extraction** — Sweet compounds dissolve
4. **Late extraction** — Bitter compounds dissolve

## Optimal Timing
- **Total time:** 25-30 seconds for a standard double
- **First drops:** Should appear at 5-8 seconds
- **End point:** When target yield is reached

## What Timing Tells You
- Gushes out (<15s): Too coarse, under-dosed. Grind finer.
- First drop >10s: Too fine, over-dosed. Grind coarser.
- Sprays sideways: Channeling. Improve distribution.
- Drips slowly (40s+): Too fine. Grind coarser.
- Normal flow, 25-30s: Correct. Taste to confirm.

## Taste Diagnosis
- **Sour, sharp, thin:** Under-extracted, grind finer or increase time
- **Bitter, dry, ashy:** Over-extracted, grind coarser or decrease time
- **Sweet, balanced, full:** Correctly extracted

## Summary
Extraction time is a key diagnostic tool. Target 25-30 seconds, watch for first drops at 5-8 seconds, and always confirm with taste.

## Review Questions
1. When should the first drops of espresso appear?
2. What does a sour espresso indicate?
3. Name the phases of extraction.`, 18),
      lesson('Ristretto, Espresso, Lungo, and Americano', `# Ristretto, Espresso, Lungo, and Americano

## Learning Objectives
- Define and differentiate espresso styles
- Prepare each style correctly
- Recommend the right style to guests

## Espresso (Standard)
- **Ratio:** 1:1.5-1:2
- **Yield:** 36-40g from 18g dose
- **Time:** 25-30s
- **Character:** Balanced, concentrated, with crema
- The foundation of all espresso-based drinks

## Ristretto ("Restricted")
- **Ratio:** 1:1-1:1.5
- **Yield:** 18-27g from 18g dose
- **Time:** 20-25s
- **Character:** Sweeter, more intense, thicker body. Less bitter compounds extracted.

## Lungo ("Long")
- **Ratio:** 1:2.5-1:3
- **Yield:** 45-54g from 18g dose
- **Time:** 35-45s
- **Character:** Thinner, more diluted, higher bitterness

## Americano
- **Method:** Hot water added to espresso (or espresso added to water)
- **Standard:** Double espresso (36g) + 120-180g hot water
- **Water first:** Preserves crema better
- **Character:** Coffee-shop black coffee, lighter body than drip

## Summary
Ristretto is short and intense, espresso is balanced, lungo is long and mild, and Americano dilutes espresso with hot water. Each style has its place in a professional menu.

## Review Questions
1. How does a ristretto differ from a lungo in extraction time?
2. Why should water be added before espresso for an Americano?
3. What is the standard yield for a double espresso?`, 15),
    ]
  },
  {
    title: 'Milk and Espresso Drinks',
    lessons: [
      lesson('Cappuccino, Latte, Mocha, Macchiato, and Breve', `# Classic Espresso-Based Milk Drinks

## Learning Objectives
- Define and prepare the major milk-based espresso drinks
- Understand standard ratios and glass sizes
- Customize drinks to guest preferences

## Cappuccino
- **Build:** 1 shot espresso + steamed milk + thick foam
- **Ratio:** 1/3 espresso, 1/3 milk, 1/3 foam
- **Size:** 150-180ml
- **Character:** Strong coffee flavor with creamy foam

## Latte (Caffe Latte)
- **Build:** 1-2 shots espresso + steamed milk + thin foam layer
- **Ratio:** 1/5 espresso, 3/5 milk, 1/5 foam
- **Size:** 240-350ml
- **Character:** Smooth, milky, mild coffee flavor. The canvas for latte art.

## Mocha (Caffe Mocha)
- **Build:** 1-2 shots espresso + chocolate + steamed milk + whipped cream (optional)
- **Size:** 240-350ml
- **Character:** Chocolate-coffee fusion
- **Tip:** Mix chocolate with espresso before adding milk for even distribution.

## Macchiato ("Marked")
- **Traditional:** 1 shot espresso + a "mark" of foam (about 1 tablespoon)
- **Size:** 90-120ml
- **Character:** Strong espresso softened by a touch of foam

## Breve
- **Build:** Same as latte but with half-and-half instead of whole milk
- **Size:** 240-350ml
- **Character:** Richer, creamier, more decadent than a standard latte

## Summary
Each espresso drink has a distinct ratio and character. Mastering these classics allows baristas to deliver consistent, guest-pleasing beverages.

## Review Questions
1. What is the ratio of milk to espresso in a cappuccino vs. a latte?
2. How does a breve differ from a latte?
3. What distinguishes a traditional macchiato?`, 20),
      lesson('Milk Steaming and Microfoam', `# Milk Steaming and Microfoam

## Learning Objectives
- Operate a steam wand safely and effectively
- Create proper microfoam
- Avoid common steaming mistakes

## Milk Steaming Process
### Step 1: Purge
Open the steam wand briefly to clear condensation.

### Step 2: Stretching (Aeration)
Submerge the tip just below the milk surface. Open steam fully. You should hear a gentle "tsst-tsst" sound — this incorporates air. Stretch until the milk reaches approximately 35-40°C.

### Step 3: Texturing (Spinning)
Submerge the tip deeper to create a whirlpool. This folds air bubbles into the milk, creating smooth microfoam. Continue until the pitcher is too hot to hold comfortably (60-65°C).

### Step 4: Stop and Wipe
Close the steam wand, wipe it immediately with a clean cloth, and purge again.

## Temperature Guide
- **Latte:** 60-65°C
- **Cappuccino:** 60-65°C
- **Flat white:** 60-63°C
- **Children's drink:** 55-60°C
- **Never exceed 70°C** — milk proteins denature and the drink tastes burnt.

## Microfoam Quality
Good microfoam is:
- Glossy and wet-looking (not dry or bubbly)
- Pourable like wet paint
- Free of visible bubbles
- Silky on the tongue

## Common Mistakes
- Tip too deep = no aeration (flat milk)
- Tip too shallow = big bubbles (dry foam)
- Over-heating = scorched milk
- Not wiping wand = milk residue builds up

## Summary
Steaming milk is a fundamental barista skill. Stretch, texture, control temperature, and always clean the wand. Great microfoam is the foundation of great milk drinks.

## Review Questions
1. What sound indicates proper aeration?
2. What is the maximum temperature for steamed milk?
3. Describe the difference between stretching and texturing.`, 20),
      lesson('Milk Chemistry and Temperature', `# Milk Chemistry and Temperature

## Learning Objectives
- Understand milk composition and how it affects steaming
- Choose the right milk for different applications
- Understand alternative milk behaviors

## Milk Composition
Cow's milk is approximately:
- **Water:** 87%
- **Fat:** 3.5-4% (whole), 1.5-2% (semi-skimmed), less than 0.5% (skimmed)
- **Protein:** 3.2% (casein and whey)
- **Lactose:** ~4.8% (milk sugar)

## How Temperature Affects Milk
- **Cold (4°C):** Proteins are relaxed, best for aeration
- **35-40°C:** Optimal stretching zone
- **60-65°C:** Peak sweetness — lactose is most perceptible
- **70°C+:** Proteins break down, flavors turn "cooked" or burnt

## Fat Content Effects
- **Whole milk:** Best texture, richest flavor, most forgiving
- **Semi-skimmed:** Good texture, slightly less rich
- **Skimmed:** Foams easily but foam is drier, less creamy

## Alternative Milks
### Oat Milk
Best all-rounder for coffee. Steams well, creamy. Barista versions are formulated with added oils and stabilizers.

### Soy Milk
Good foam but can curdle with acidic coffee. Add espresso to milk (not milk to espresso).

### Almond Milk
Lighter body, can separate. Use barista-specific versions.

### Coconut Milk
Distinct flavor. Foam is less stable. Good in flavored drinks.

## Summary
Understanding milk chemistry helps baristas choose the right milk and steam it correctly. Temperature control is the single most important variable.

## Review Questions
1. What happens to milk proteins above 70°C?
2. Which milk type creates the most stable microfoam and why?
3. How should soy milk be added to espresso?`, 15),
      lesson('Latte Art and Pouring Techniques', `# Latte Art and Pouring Techniques

## Learning Objectives
- Prepare milk and espresso for latte art
- Pour basic patterns (heart, rosetta, tulip)
- Troubleshoot common latte art problems

## Prerequisites for Latte Art
1. **Microfoam** — Glossy, pourable, no bubbles
2. **Espresso with crema** — Fresh crema provides contrast
3. **Proper vessel** — Wide-mouth cup
4. **Technique** — Controlled pour height and speed

## The Pouring Process
### Phase 1: Establish the Base
Pour from a height (~10cm) into the center. This sinks the milk below the crema, creating a brown canvas.

### Phase 2: Create the Pattern
Lower the pitcher close to the surface (~1cm). Increase flow. White foam appears on the brown crema. Use wrist movements to shape the pattern.

### Phase 3: The Cut-Through
Lift the pitcher and draw a line through the center to finish.

## Basic Patterns
### Heart
1. Pour into center until cup is half full
2. Lower pitcher, increase flow — a white circle appears
3. Continue until circle fills most of the surface
4. Lift and cut through the center

### Rosetta (Fern)
1. Pour base as above
2. Wiggle the pitcher side-to-side while moving backward
3. Creates layered leaves
4. Cut through at the end

### Tulip
1. Pour a blob, stop
2. Pour a second blob behind the first
3. Repeat 2-3 times
4. Cut through

## Common Problems
- No white appears: Foam too thin, pour too high
- Big white blob: Foam too thick, pour too low
- Pattern sinks: Too much milk before starting
- Blurry edges: Milk too thin or crema broken

## Summary
Latte art is a skill built on perfect microfoam and controlled pouring. Start with hearts, progress to tulips, then rosettas. Practice every day.

## Review Questions
1. Why must you start pouring from a height?
2. What creates the white pattern on the crema?
3. Name three basic latte art patterns.`, 20),
    ]
  },
  {
    title: 'Brewing Methods',
    lessons: [
      lesson('V60 Pour-Over', `# V60 Pour-Over

## Learning Objectives
- Understand the V60 brewing method
- Execute a proper pour-over technique
- Adjust variables for optimal flavor

## Equipment
- Hario V60 dripper
- V60 paper filter
- Gooseneck kettle
- Scale with timer
- Freshly ground coffee (medium-fine)
- Carafe or cup

## Standard Recipe
- **Dose:** 15g coffee
- **Water:** 250g (1:16.7 ratio)
- **Grind:** Medium-fine (like table salt)
- **Water temperature:** 92-96°C
- **Total brew time:** 2:30-3:30

## Brewing Steps
### Step 1: Prepare
Place filter in V60, rinse with hot water. Discard rinse water.

### Step 2: Add Coffee
Add 15g ground coffee. Shake gently to level. Tare scale.

### Step 3: Bloom (0:00-0:30)
Pour 30-45g of water in a circular motion. Wait 30 seconds. CO2 escapes (the coffee "blooms").

### Step 4: First Pour (0:30-1:00)
Pour in slow concentric circles to 150g total.

### Step 5: Second Pour (1:00-1:30)
Continue pouring to 250g total.

### Step 6: Drawdown (1:30-3:00)
Allow water to drain completely. Target finish time: 2:30-3:30.

## Adjustments
- **Too fast, sour:** Grind finer
- **Too slow, bitter:** Grind coarser
- **Weak, watery:** Increase dose
- **Too strong:** Decrease dose

## Summary
The V60 produces a clean, bright cup that highlights origin characteristics. Control the pour speed, maintain water temperature, and adjust grind for your target flavor.

## Review Questions
1. What is the purpose of the bloom phase?
2. What is the standard V60 brew ratio?
3. How do you fix a sour pour-over?`, 18),
      lesson('French Press', `# French Press

## Learning Objectives
- Brew coffee using the French press method
- Understand full-immersion brewing
- Achieve a clean, full-bodied cup

## What Is a French Press?
A French press is a full-immersion brewer. Coffee steeps in hot water, then a metal mesh plunger separates the grounds.

## Standard Recipe
- **Dose:** 30g coffee
- **Water:** 500g (1:16.7 ratio)
- **Grind:** Coarse (like sea salt)
- **Water temperature:** 93-96°C
- **Steep time:** 4 minutes

## Brewing Steps
1. Add coarse grounds to the press
2. Pour all water at once
3. Stir gently to ensure all grounds are wetted
4. Place lid (plunger up) and wait 4 minutes
5. Slowly press the plunger down
6. Pour immediately (don't let coffee sit on the grounds)

## Tips for a Cleaner Cup
- Use a coarse, even grind
- Don't over-steep (beyond 4 min = bitter)
- Skim the floating foam before plunging
- Decant into another vessel immediately

## Summary
The French press produces a full-bodied, rich cup with natural oils. Coarse grind, 4-minute steep, and prompt decanting are the keys to quality.

## Review Questions
1. What grind size is appropriate for French press?
2. Why should you decant immediately after plunging?
3. What happens if you steep for too long?`, 12),
      lesson('Moka Pot', `# Moka Pot

## Learning Objectives
- Operate a moka pot correctly
- Understand stovetop pressure brewing
- Avoid common moka pot mistakes

## What Is a Moka Pot?
A moka pot is a stovetop brewer that uses steam pressure (about 1-2 bar) to push water through ground coffee. It produces a strong, concentrated brew — not true espresso (which uses 9 bar).

## Standard Recipe
- **Dose:** Fill the basket level (do not tamp)
- **Water:** Fill the boiler to just below the safety valve
- **Grind:** Fine to medium-fine
- **Heat:** Medium-low
- **Time:** 3-5 minutes

## Brewing Steps
1. Fill the boiler with hot water (just below the safety valve)
2. Fill the filter basket with coffee, level (do not tamp)
3. Assemble and place on medium-low heat
4. When coffee begins to flow, reduce heat
5. Remove from heat when the stream turns blonde or sputters
6. Stir the brew in the carafe before serving

## Common Mistakes
- **Tamping the coffee:** Creates too much resistance
- **High heat:** Burns the coffee, metallic taste
- **Leaving on heat:** Continues to extract after brewing

## Summary
The moka pot is a classic stovetop method that produces strong, aromatic coffee. Medium-low heat, no tamping, and prompt removal from heat ensure quality.

## Review Questions
1. How does moka pot pressure compare to espresso?
2. Should you tamp coffee in a moka pot?
3. When should you remove the moka pot from heat?`, 12),
      lesson('Siphon Brewing', `# Siphon Brewing

## Learning Objectives
- Understand the siphon (vacuum pot) brewing method
- Execute a siphon brew
- Appreciate the theatrical and scientific aspects

## How It Works
1. **Heating:** Water in the lower chamber boils, creating vapor pressure
2. **Rising:** Vapor pressure pushes water up into the upper chamber
3. **Steeping:** Coffee steeps in the upper chamber at 92-95°C
4. **Vacuum:** Removing heat creates a vacuum, pulling brewed coffee back down through the filter

## Standard Recipe
- **Dose:** 20-25g coffee
- **Water:** 350-400g
- **Grind:** Medium (like pour-over)
- **Steep time:** 60-90 seconds
- **Total time:** ~5 minutes

## Brewing Steps
1. Fill the lower chamber with hot water
2. Attach the upper chamber with filter
3. Heat until water rises
4. Add coffee to upper chamber, stir to wet all grounds
5. Steep for 60-90 seconds
6. Remove from heat — coffee draws down
7. Serve

## Summary
Siphon brewing produces a clean, tea-like body with remarkable clarity. It's a showcase method that demonstrates coffee science in action.

## Review Questions
1. What forces the water up into the upper chamber?
2. What creates the vacuum that draws coffee back down?
3. What is the ideal steep time for siphon coffee?`, 15),
      lesson('Coffee Cupping and Sensory Evaluation', `# Coffee Cupping and Sensory Evaluation

## Learning Objectives
- Understand the cupping protocol
- Evaluate coffee using standardized terminology
- Develop your sensory skills

## What Is Cupping?
Cupping is the standardized method of evaluating coffee quality. It is used by roasters, buyers, Q-graders, and baristas to assess aroma, flavor, body, acidity, and overall quality.

## Cupping Protocol (SCA Standard)
### Preparation
1. Grind coffee (medium-coarse)
2. Use 8.25g per 150ml cup
3. Use water at 93°C
4. Prepare 5 cups per sample

### The Process
1. **Smell dry grounds** — Assess fragrance
2. **Pour water** — Fill to rim, wait 4 minutes
3. **Break the crust** — Stir the surface with a spoon, smell the aroma
4. **Remove floating grounds** — Skim with two spoons
5. **Wait until cool** (~10 minutes) — Taste as it cools
6. **Slurp and evaluate** — Use a cupping spoon, slurp to spray across palate

## Evaluation Categories
- **Fragrance/Aroma:** Dry and wet smell
- **Flavor:** The overall taste impression
- **Aftertaste:** What lingers after swallowing
- **Acidity:** Brightness (positive) vs. sourness (negative)
- **Body:** Weight and texture on the tongue
- **Balance:** How well flavors work together
- **Uniformity:** Consistency across cups
- **Clean Cup:** No defects or off-flavors
- **Sweetness:** Perceived sugar
- **Overall:** Final impression

## Summary
Cupping is the universal language of coffee quality. Regular cupping develops your palate and improves every aspect of coffee service.

## Review Questions
1. What is the standard cupping ratio?
2. When do you "break the crust"?
3. What does "body" refer to in coffee evaluation?`, 18),
    ]
  },
  {
    title: 'Quality Control',
    lessons: [
      lesson('Total Dissolved Solids (TDS)', `# Total Dissolved Solids (TDS) and Extraction Yield

## Learning Objectives
- Understand TDS and extraction yield
- Use a refractometer to measure coffee strength
- Apply data to improve brewing consistency

## What Is TDS?
Total Dissolved Solids (TDS) measures the concentration of dissolved substances in brewed coffee, expressed as a percentage. A TDS of 1.30% means 1.30% of the beverage weight is dissolved coffee solids.

## Extraction Yield
Extraction yield is the percentage of the coffee grounds' mass that was dissolved into the water.

**Formula:** Extraction Yield % = (Brew Weight x TDS%) / Dose Weight x 100

**Example:** 200g brew x 1.35% TDS / 15g dose = 18% extraction yield

## Ideal Parameters
- **Espresso TDS:** 8-12%
- **Filter Coffee TDS:** 1.15-1.35%
- **Both target extraction yield:** 18-22%

## The Flavor Map
- **Under-extracted (<18%):** Sour, salty, thin
- **Correctly extracted (18-22%):** Balanced, sweet, complex
- **Over-extracted (>22%):** Bitter, dry, ashy, hollow

## Using a Refractometer
1. Brew coffee using your standard recipe
2. Place a few drops on the refractometer lens
3. Read the TDS percentage
4. Calculate extraction yield
5. Adjust recipe based on results

## Summary
TDS and extraction yield provide objective data to complement sensory evaluation. The "golden cup" zone of 18-22% extraction is the target for balanced coffee.

## Review Questions
1. What is the ideal extraction yield range?
2. What does under-extracted coffee taste like?
3. How do you calculate extraction yield?`, 15),
      lesson('Under-Extraction and Over-Extraction', `# Under-Extraction and Over-Extraction

## Learning Objectives
- Identify causes of under- and over-extraction
- Apply corrective measures
- Understand the extraction continuum

## Under-Extraction
### Symptoms
- Sour, sharp, or salty taste
- Thin body, watery
- Fast flow (espresso) or fast drawdown (filter)

### Causes
- Grind too coarse
- Dose too low
- Water temperature too low
- Brew time too short
- Channeling

### Corrections
- Grind finer
- Increase dose
- Increase water temperature
- Extend brew time
- Improve distribution

## Over-Extraction
### Symptoms
- Bitter, harsh, ashy taste
- Dry, astringent mouthfeel
- Slow flow or drawdown

### Causes
- Grind too fine
- Dose too high
- Water temperature too high
- Brew time too long

### Corrections
- Grind coarser
- Decrease dose
- Lower water temperature
- Shorten brew time

## Summary
Under-extracted coffee is sour and thin; over-extracted coffee is bitter and dry. Adjust grind size, dose, temperature, and time to reach the balanced middle.

## Review Questions
1. What are three causes of under-extraction?
2. How can you correct over-extraction in an espresso?
3. Describe the taste of correctly extracted coffee.`, 15),
      lesson('Troubleshooting Coffee Problems', `# Troubleshooting Coffee Problems

## Learning Objectives
- Diagnose common coffee problems
- Apply systematic troubleshooting
- Communicate solutions to guests and colleagues

## Problem-Solution Guide
- **Sour Coffee:** Under-extraction. Grind finer, increase brew time, increase temperature.
- **Bitter Coffee:** Over-extraction. Grind coarser, decrease brew time, decrease temperature.
- **Weak/Watery:** Too low dose, too high ratio. Increase dose, use a tighter ratio.
- **Flat/Bland:** Old beans, water too cold. Use fresh beans, increase temperature.
- **Burnt Taste:** Over-extraction, water too hot, scalded milk. Reduce temperature, check steaming.
- **Metallic Taste:** Old equipment, scale buildup. Descale machine, clean thoroughly.
- **Large Bubbles in Crema:** Fresh coffee (too much CO2) or channeling. Wait 7-10 days after roast; improve puck prep.

## Systematic Approach
1. **Identify** the problem clearly
2. **Taste** — what specific flavors are present?
3. **Check** grind, dose, time, temperature
4. **Adjust** one variable at a time
5. **Retaste** and confirm improvement

## Summary
Every coffee problem has a logical cause. Systematic diagnosis and single-variable adjustment lead to solutions.

## Review Questions
1. What are the three most common espresso problems and their fixes?
2. Why should you only change one variable at a time?
3. How do you fix metallic-tasting coffee?`, 15),
      lesson('Coffee Cleaning and Machine Maintenance', `# Coffee Cleaning and Machine Maintenance

## Learning Objectives
- Perform daily, weekly, and monthly cleaning tasks
- Maintain grinder and espresso machine hygiene
- Extend equipment lifespan through proper care

## Daily Cleaning Tasks
- **Group head:** Brush and flush after every few shots
- **Portafilter & baskets:** Soak and scrub daily
- **Steam wand:** Purge after every use, wipe with a dedicated cloth, soak tips nightly
- **Drip tray:** Empty and wash
- **Knock box:** Empty and clean
- **Counters:** Sanitize all surfaces
- **Cloths:** Use separate cloths for milk and espresso; wash daily

## Weekly Tasks
### Backflush (with blind basket):
1. Insert blind basket
2. Add cleaning detergent (about 1/2 tsp)
3. Run pump for 10 seconds, stop for 10 seconds, repeat 5 times
4. Remove basket, rinse, run clean water through group
- **Soak** portafilters and baskets in detergent solution
- **Clean** grinder hopper and burr chamber

## Monthly Tasks
- **Descale** the machine (if not on filtered water)
- **Replace** water filters
- **Inspect** gaskets, seals, and shower screens
- **Service** check by a technician if needed

## Grinder Maintenance
- Brush out grounds daily
- Use grinder cleaning tablets monthly
- Never wash burrs with water

## Summary
Clean equipment produces better coffee and lasts longer. Establish daily, weekly, and monthly cleaning routines and stick to them rigorously.

## Review Questions
1. How often should you backflush an espresso machine?
2. What is the daily steam wand cleaning procedure?
3. Why should you never wash grinder burrs with water?`, 15),
      lesson('Hygiene and Workplace Safety', `# Hygiene and Workplace Safety

## Learning Objectives
- Apply food safety principles in a cafe environment
- Maintain personal hygiene standards
- Prevent workplace accidents

## Personal Hygiene
- Wash hands before handling food/drink and after touching face, phone, or waste
- Wear clean uniform and apron
- Tie back long hair; wear a hat if required
- Cover cuts with bright-colored waterproof plasters
- No jewelry on hands/wrists (except plain wedding band)
- Do not touch face, hair, or phone while preparing drinks

## Food Safety in the Cafe
- Keep milk refrigerated at 4°C or below
- Use milk within its use-by date
- Discard steamed milk left standing more than 30 seconds
- Never re-steam milk
- Clean and sanitize all surfaces between uses

## Chemical Safety
- Store cleaning chemicals separately from food items
- Always dilute chemicals according to instructions
- Wear gloves when handling strong cleaners
- Never mix chemicals (especially bleach and acid)

## Electrical and Burn Safety
- Keep electrical equipment away from water
- Report frayed cables immediately
- Use caution around hot surfaces
- Know the location of the fire extinguisher and first aid kit
- Report all accidents and near-misses

## Summary
Hygiene and safety are non-negotiable in hospitality. Follow personal hygiene protocols, maintain clean equipment, and be aware of hazards at all times.

## Review Questions
1. What is the maximum holding temperature for milk?
2. Why should you never re-steam milk?
3. Name three electrical safety practices in a cafe.`, 12),
    ]
  },
  {
    title: 'Business and Assessment',
    lessons: [
      lesson('Coffee Recipe Costing and Pricing', `# Coffee Recipe Costing and Pricing

## Learning Objectives
- Calculate the cost of each drink
- Set menu prices using standard markup principles
- Understand contribution to margin

## Costing a Drink
### Example: Cappuccino
- Coffee beans: 18g at $25/kg = $0.45
- Milk: 150ml at $1.20/L = $0.18
- Cup/lid/napkin = $0.12
- **Total COGS = $0.75**

## Pricing Methods
### Food Cost Percentage
- Target: 25-35% food cost for beverages
- Price = Cost / Target percentage
- $0.75 / 0.30 = $2.50

### Gross Profit Margin
- Target: 65-75% margin
- Price = Cost / (1 - Target margin)
- $0.75 / 0.30 = $2.50

### Competitive Pricing
Research local competitors. Price within the market range while reflecting your quality and brand.

## Hidden Costs to Consider
- Waste and spillage (budget 5-10%)
- Staff time
- Equipment amortization
- Rent and utilities
- Marketing

## Summary
Accurate costing and strategic pricing ensure profitability. Know your costs, target appropriate margins, and regularly review pricing.

## Review Questions
1. What is a healthy food cost percentage for cafe beverages?
2. Name three hidden costs in drink pricing.
3. How do you calculate price from a 30% food cost target?`, 15),
      lesson('Final Practical Assessment', `# Final Practical Assessment

## Assessment Overview
This assessment tests your practical skills and theoretical knowledge across all modules.

## Part 1: Espresso Extraction (40 points)
Prepare and present:
1. A double espresso with correct dose (18g), yield (36g), and time (25-30s)
2. Taste evaluation — describe the flavor profile
3. One adjustment and justification

## Part 2: Milk Steaming and Pouring (30 points)
Prepare and present:
1. A perfectly steamed microfoam pitcher
2. A latte with heart or rosetta art
3. Temperature control (60-65°C)

## Part 3: Alternative Brew (15 points)
Prepare a V60 pour-over or French press to recipe. Explain your technique.

## Part 4: Troubleshooting (15 points)
Given a described problem, diagnose the cause and propose a solution.

## Passing Requirements
- **Overall:** 70% minimum
- **Each section:** 60% minimum
- **Safety and hygiene:** Must be satisfactory (automatic fail if not)

## Summary
This assessment verifies your readiness to work as a professional barista. Practice all skills regularly before attempting.

## Review Questions
1. What is the passing score for the overall assessment?
2. What are the four parts of the practical assessment?
3. Can you pass if your hygiene is unsatisfactory?`, 30),
    ]
  }
];

// Compact course definitions for the other 5 categories
function makeCourse(slug, title, category, level, description, duration, instructor, instructorBio, moduleDefs) {
  return { slug, title, category, level, description, duration, instructor, instructorBio, modules: moduleDefs };
}

function mod(title, lessonTitles) {
  return {
    title,
    lessons: lessonTitles.map(([t, content]) => lesson(t, content || defaultLessonContent(t), 15))
  };
}

function defaultLessonContent(title) {
  return `# ${title}

## Learning Objectives
- Understand the key concepts of ${title.toLowerCase()}
- Apply professional standards in hospitality operations
- Demonstrate competence in practical applications

## Key Concepts
${title} is an essential topic in hospitality. This lesson covers the fundamental principles, best practices, and real-world applications that every hospitality professional needs to know.

## Practical Applications
In a professional setting, ${title.toLowerCase()} requires attention to detail, consistent practice, and a commitment to quality. Focus on understanding the theory first, then apply it through hands-on practice.

## Important Considerations
Always follow established procedures and safety guidelines. When in doubt, consult your supervisor or reference materials. Continuous improvement is the hallmark of a great hospitality professional.

## Summary
Mastering ${title} builds your professional capability. Review the key points regularly and apply them in your daily work.

## Review Questions
1. What are the main principles of ${title.toLowerCase()}?
2. How does this topic affect guest satisfaction?
3. What professional standards should be maintained?`;
}

const otherCourses = [
  makeCourse('hotel-management-front-office', 'Hotel Management and Front Office', 'hotel', 'beginner',
    'Learn the fundamentals of hotel operations, front office procedures, reservations, guest registration, billing, and professional customer service.',
    30, 'James Okoro', 'Front office manager passionate about delivering exceptional guest experiences.',
    [
      mod('Introduction to Hospitality', [
        ['Introduction to Hospitality', `# Introduction to Hospitality

## Learning Objectives
- Define hospitality and its significance
- Understand the scope of the hospitality industry
- Identify career opportunities

## What Is Hospitality?
Hospitality is the act of providing comfort, care, and service to guests and customers. It encompasses lodging, food and beverage, travel, tourism, and event management.

## The Hospitality Industry
- **Hotels** — From budget to ultra-luxury
- **Restaurants & Cafes** — Food and beverage service
- **Resorts** — Recreational lodging
- **Event Management** — Weddings, conferences, banquets
- **Travel & Tourism** — Airlines, cruises, tour operators

## Core Values
1. **Guest first** — Every decision centers on guest satisfaction
2. **Warmth** — Genuine friendliness in every interaction
3. **Attention to detail** — Small touches create big impressions
4. **Integrity** — Honest, ethical behavior
5. **Teamwork** — Departments collaborate for seamless service

## Career Paths
- Front office agent to Supervisor to Manager to General Manager
- F&B server to Captain to Restaurant Manager to F&B Director
- Housekeeping attendant to Supervisor to Executive Housekeeper

## Summary
Hospitality is a rewarding, global industry built on making people feel welcome and valued.

## Review Questions
1. Define hospitality in your own words.
2. Name three sectors within the hospitality industry.
3. What are the core values of hospitality?`],
        ['Hotel Departments and Responsibilities', `# Hotel Departments and Responsibilities

## Learning Objectives
- Identify the major hotel departments
- Understand each department's role
- Recognize how departments work together

## Major Departments
### Front Office
The "face" of the hotel. Handles reservations, registration, check-in/check-out, guest inquiries, and cashiering.

### Housekeeping
Maintains cleanliness, comfort, and aesthetic appeal of all rooms and public areas.

### Food and Beverage (F&B)
Operates restaurants, bars, room service, banquets, and catering.

### Sales and Marketing
Drives revenue through corporate accounts, group bookings, and online marketing.

### Kitchen / Culinary
Prepares all food items. Works closely with F&B service.

### Finance / Accounting
Manages billing, payroll, budgets, and financial reporting.

### Human Resources
Recruits, trains, and supports all staff.

### Security
Protects guests, staff, and property.

### Maintenance / Engineering
Maintains the physical plant — plumbing, electrical, HVAC.

## How Departments Work Together
A guest checking in may interact with front office, housekeeping, bell staff, and F&B. Every department contributes to the guest experience.

## Summary
Hotels are complex operations with many specialized departments.

## Review Questions
1. Which department is the primary guest contact point?
2. What does housekeeping manage beyond room cleaning?
3. How do departments collaborate during a guest check-in?`],
        ['Reservations and Booking Procedures'],
        ['Guest Registration and Check-In'],
        ['Check-Out Procedures'],
      ]),
      mod('Guest Services', [
        ['Telephone and Email Etiquette'],
        ['Customer Service and Professional Communication'],
        ['Handling Guest Complaints'],
        ['Billing, Payments, and Cashiering'],
        ['Guest Privacy and Safety'],
      ]),
      mod('Final Assessment', [
        ['Front Office Software Concepts'],
        ['Final Assessment'],
      ]),
    ]),
  makeCourse('food-beverage-service', 'Food and Beverage Service', 'fbe', 'beginner',
    'Master restaurant service fundamentals — table setting, menu knowledge, order taking, service styles, and professional dining room operations.',
    25, 'Maria Santos', 'Restaurant service specialist and F&B instructor with fine dining experience.',
    [
      mod('Service Foundations', [
        ['Restaurant Service Fundamentals'],
        ['Table Setting and Mise en Place'],
        ['Restaurant Equipment and Cutlery'],
      ]),
      mod('Menu and Order Management', [
        ['Menu Knowledge'],
        ['Food Allergens and Guest Safety'],
        ['Taking Orders'],
        ['Plate Carrying and Tray Handling'],
      ]),
      mod('Service Styles', [
        ['Food Presentation and Service Etiquette'],
        ['Different Service Styles'],
        ['Upselling and Customer Care'],
        ['Billing and Restaurant Operations'],
      ]),
      mod('Assessment', [
        ['Final Assessment'],
      ]),
    ]),
  makeCourse('bartending-juices-mocktails', 'Bartending, Juices, and Mocktails', 'bartending', 'beginner',
    'Learn to craft fresh juices, creative mocktails, milkshakes, and smoothies. Master bar equipment, flavor balancing, presentation, and beverage costing.',
    20, 'Alex Chen', 'Mocktail mixologist and juice bar consultant passionate about creative non-alcoholic beverages.',
    [
      mod('Bar Foundations', [
        ['Bar Equipment and Hygiene'],
        ['Fresh Juice Preparation'],
        ['Fruit Selection and Storage'],
        ['Milkshakes and Smoothies'],
      ]),
      mod('Mocktails and Drinks', [
        ['Mojitos and Non-Alcoholic Mocktails'],
        ['Syrups and Flavor Balance'],
        ['Measuring, Shaking, Stirring, and Blending'],
        ['Glassware and Garnishing'],
        ['Beverage Presentation'],
      ]),
      mod('Business Skills', [
        ['Recipe Costing and Stock Control'],
        ['Final Assessment'],
      ]),
    ]),
  makeCourse('housekeeping-operations', 'Housekeeping', 'housekeeping', 'beginner',
    'Learn professional housekeeping operations — cleaning techniques, bed making, linen management, room inspection, hygiene, and guest privacy.',
    20, 'Priya Sharma', 'Housekeeping operations manager with luxury hotel background.',
    [
      mod('Housekeeping Fundamentals', [
        ['Introduction to Housekeeping'],
        ['Cleaning Tools and Chemicals'],
        ['Bedroom and Bathroom Cleaning'],
      ]),
      mod('Professional Standards', [
        ['Professional Bed Making'],
        ['Linen Management'],
        ['Laundry and Stain Removal'],
        ['Room Inspection'],
      ]),
      mod('Operations and Safety', [
        ['Cleaning Schedules'],
        ['Hygiene and Workplace Safety'],
        ['Lost-Property Procedures'],
        ['Guest Privacy'],
      ]),
      mod('Assessment', [
        ['Final Assessment'],
      ]),
    ]),
  makeCourse('event-planning-hospitality-business', 'Event Planning and Hospitality Business', 'events', 'beginner',
    'Learn event planning fundamentals, budgeting, venue coordination, hospitality marketing, and how to start a hospitality business or prepare for job interviews.',
    25, 'David Kim', 'Event planner specializing in weddings and corporate conferences.',
    [
      mod('Event Planning Fundamentals', [
        ['Event Planning Fundamentals'],
        ['Budgeting and Quotations'],
        ['Weddings, Conferences, and Banquets'],
      ]),
      mod('Operations', [
        ['Venue Setup and Coordination'],
        ['Guest Communication'],
        ['Event Service'],
      ]),
      mod('Business Skills', [
        ['Hospitality Marketing and Sales'],
        ['Pricing, Inventory, and Profit Calculation'],
        ['Starting a Hospitality Business'],
        ['CV Preparation and Job Interviews'],
      ]),
      mod('Assessment', [
        ['Final Assessment'],
      ]),
    ]),
];

// Quizzes per course (module-level)
const quizTemplates = {
  barista: [
    { moduleIndex: 0, title: 'Coffee Foundations Quiz', questions: [
      { q: 'What percentage of global coffee production is Arabica?', options: ['30-40%', '60-70%', '90-95%', '10-20%'], correct: 1 },
      { q: 'Which country is traditionally credited with coffee\'s discovery?', options: ['Brazil', 'Yemen', 'Ethiopia', 'Colombia'], correct: 2 },
      { q: 'What is the ideal moisture content for green coffee storage?', options: ['5-8%', '10-12%', '15-18%', '20-25%'], correct: 1 },
      { q: 'What happens during "first crack" in roasting?', options: ['Coffee burns', 'Beans audibly crack and expand', 'Water evaporates', 'Oils appear on surface'], correct: 1 },
      { q: 'Why are burr grinders preferred over blade grinders?', options: ['They are cheaper', 'They grind faster', 'They produce consistent particle size', 'They are quieter'], correct: 2 },
    ]},
    { moduleIndex: 1, title: 'Espresso Mastery Quiz', questions: [
      { q: 'What is the standard double espresso dose?', options: ['12g', '18g', '25g', '30g'], correct: 1 },
      { q: 'What is the standard brew ratio for espresso?', options: ['1:1', '1:2', '1:3', '1:4'], correct: 1 },
      { q: 'What does a sour espresso indicate?', options: ['Over-extraction', 'Under-extraction', 'Correct extraction', 'Stale beans'], correct: 1 },
      { q: 'What is the target extraction time for a double espresso?', options: ['10-15 seconds', '25-30 seconds', '40-45 seconds', '60 seconds'], correct: 1 },
      { q: 'What is channeling?', options: ['Water flowing unevenly through the puck', 'Coffee blooming', 'Milk curdling', 'Grinder overheating'], correct: 0 },
    ]},
    { moduleIndex: 2, title: 'Milk and Drinks Quiz', questions: [
      { q: 'What is the maximum safe temperature for steamed milk?', options: ['50°C', '60°C', '70°C', '80°C'], correct: 2 },
      { q: 'What is the milk-to-espresso ratio in a cappuccino?', options: ['1:1:1', '2:1:1', '3:1:1', '1:2:1'], correct: 0 },
      { q: 'What is microfoam?', options: ['Bubbly dry foam', 'Smooth, glossy, pourable milk', 'Scalded milk', 'Milk with ice'], correct: 1 },
      { q: 'What creates latte art?', options: ['Food coloring', 'White foam on brown crema', 'Chocolate sauce', 'Powdered sugar'], correct: 1 },
    ]},
    { moduleIndex: 3, title: 'Brewing Methods Quiz', questions: [
      { q: 'What is the standard V60 brew ratio?', options: ['1:10', '1:16.7', '1:5', '1:25'], correct: 1 },
      { q: 'How long should a French press steep?', options: ['1 minute', '2 minutes', '4 minutes', '10 minutes'], correct: 2 },
      { q: 'What is the "bloom" in pour-over brewing?', options: ['Adding sugar', 'CO2 escaping when water hits grounds', 'Milk frothing', 'Filter rinsing'], correct: 1 },
      { q: 'What grind size is used for French press?', options: ['Extra fine', 'Medium', 'Coarse', 'Extra coarse only'], correct: 2 },
    ]},
    { moduleIndex: 4, title: 'Quality Control Quiz', questions: [
      { q: 'What is the ideal extraction yield range?', options: ['10-15%', '18-22%', '25-30%', '35-40%'], correct: 1 },
      { q: 'What does a TDS of 1.35% indicate for filter coffee?', options: ['Too weak', 'Correct range', 'Too strong', 'Broken refractometer'], correct: 1 },
      { q: 'How often should you backflush an espresso machine?', options: ['Daily', 'Weekly', 'Monthly', 'Yearly'], correct: 1 },
      { q: 'What sound indicates proper milk aeration?', options: ['Loud screaming', 'Gentle tsst-tsst', 'Complete silence', 'Bubbling boil'], correct: 1 },
    ]},
  ],
};

export async function seedCourses() {
  console.log('Seeding courses...');

  const allCourses = [
    makeCourse('barista-coffee-training', 'Barista and Coffee Training', 'barista', 'beginner',
      'Master the complete art and science of professional coffee making — from bean origin to espresso extraction, milk steaming, latte art, and advanced brewing methods.',
      40, 'Sarah Mitchell', 'Certified barista trainer with 8 years of specialty coffee experience and SCA credentials.',
      baristaModules),
    ...otherCourses
  ];

  for (const courseData of allCourses) {
    const existing = await query('SELECT id FROM courses WHERE slug = ?', [courseData.slug]);
    let courseId;
    if (existing.length > 0) {
      courseId = existing[0].id;
      console.log(`  Course exists: ${courseData.title}`);
    } else {
      const r = await execute(
        'INSERT INTO courses (slug, title, description, category, level, duration_hours, instructor_name, instructor_bio, is_public, is_published, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)',
        [courseData.slug, courseData.title, courseData.description, courseData.category, courseData.level, courseData.duration, courseData.instructor, courseData.instructorBio, allCourses.indexOf(courseData)]
      );
      courseId = r.insertId;
      console.log(`  Created course: ${courseData.title}`);
    }

    for (let mi = 0; mi < courseData.modules.length; mi++) {
      const m = courseData.modules[mi];
      const existingMod = await query('SELECT id FROM modules WHERE course_id = ? AND title = ?', [courseId, m.title]);
      let moduleId;
      if (existingMod.length > 0) {
        moduleId = existingMod[0].id;
      } else {
        const r = await execute('INSERT INTO modules (course_id, title, sort_order) VALUES (?, ?, ?)', [courseId, m.title, mi]);
        moduleId = r.insertId;
      }

      for (let li = 0; li < m.lessons.length; li++) {
        const l = m.lessons[li];
        const existingLesson = await query('SELECT id FROM lessons WHERE module_id = ? AND title = ?', [moduleId, l.title]);
        if (existingLesson.length === 0) {
          await execute(
            'INSERT INTO lessons (module_id, title, content, duration_minutes, is_public, sort_order) VALUES (?, ?, ?, ?, 1, ?)',
            [moduleId, l.title, l.content, l.duration, li]
          );
        }
      }

      // Create quizzes for barista course
      if (courseData.slug === 'barista-coffee-training' && quizTemplates.barista) {
        const qt = quizTemplates.barista.find(q => q.moduleIndex === mi);
        if (qt) {
          const existingQuiz = await query('SELECT id FROM quizzes WHERE module_id = ? LIMIT 1', [moduleId]);
          if (existingQuiz.length === 0) {
            const qr = await execute('INSERT INTO quizzes (module_id, title, pass_score) VALUES (?, ?, 70)', [moduleId, qt.title]);
            const quizId = qr.insertId;
            for (let qi = 0; qi < qt.questions.length; qi++) {
              const qq = qt.questions[qi];
              const qR = await execute('INSERT INTO quiz_questions (quiz_id, question, sort_order) VALUES (?, ?, ?)', [quizId, qq.q, qi]);
              for (let oi = 0; oi < qq.options.length; oi++) {
                await execute('INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order) VALUES (?, ?, ?, ?)', [qR.insertId, qq.options[oi], oi === qq.correct ? 1 : 0, oi]);
              }
            }
            console.log(`    Created quiz: ${qt.title}`);
          }
        }
      }
    }
  }
  console.log('Course seeding complete.');
}
