// Real public numbers for Sonoma County, CA, pulled Oct 30, 2026. Everything else in the preview is sample data.
// Sources: Census QuickFacts and County Business Patterns (API), CSLB license list, BLS local employment and metro jobs (API),
// BLS CPI West, MIT Living Wage Calculator.
window.RAINDY = {
  place: "Sonoma County, CA",
  pulled: "Oct 30, 2026",
  people: { total: 486444, households: 190998, renters: 0.374, medianRent: 2158, year: "July 2025" },
  businesses: { withStaff: 14572, onePerson: 44462, year: 2023 },
  // People who live here and have a job, and people working or looking (labor force). Sept 2026 vs Sept 2025.
  working: { now: 236504, yearAgo: 240004, y2019: 247974, laborForce: 247201, laborForceYearAgo: 251485, month: "Sept 2026" },
  jobs: { now: 206500, yearAgo: 205000, y2019: 209000 },
  hourly: { now: 39.24, yearAgo: 39.10 },
  livingWage: { oneAdult: 31.30, oneAdultOneChild: 54.84, twoWorkingTwoKids: 36.41, minimum: 16.90, yearly: 65100, updated: "Feb 2026" },
  prices: { all: 3.2, eatingOut: 2.9, groceries: 2.6, shelter: 2.4, month: "June 2026", region: "West" },
  priceRise2019to2023: 19,
  // Businesses with staff, 2023, and change since 2019. Pay is payroll per worker, so part-time jobs pull it down.
  categories: [
   {
    "name": "Home improvement and repair",
    "note": "Plumbing, electrical, roofing, painting, remodeling",
    "estab": 1190,
    "workers": 6895,
    "workersChange": 4,
    "pay": 78.2,
    "payChange": 17,
    "licensed": "Licensed: 344 plumbing, 580 electrical, 408 painting, 176 heating/air, 2,278 general building. About half have no employees."
   },
   {
    "name": "Landscaping and gardening",
    "note": "",
    "estab": 301,
    "workers": 2645,
    "workersChange": 36,
    "pay": 53.0,
    "payChange": 18,
    "licensed": "Licensed: 372 landscaping, 138 with no employees."
   },
   {
    "name": "Automotive",
    "note": "General car repair",
    "estab": 150,
    "workers": 631,
    "workersChange": 14,
    "pay": 60.1,
    "payChange": 24
   },
   {
    "name": "Restaurants and cafes",
    "note": "Sit-down and counter service",
    "estab": 865,
    "workers": 14796,
    "workersChange": 0,
    "pay": 31.6,
    "payChange": 35
   },
   {
    "name": "Catering and events",
    "note": "",
    "estab": 43,
    "workers": 523,
    "workersChange": 39,
    "pay": 37.9,
    "payChange": 31
   },
   {
    "name": "Groceries and markets",
    "note": "",
    "estab": 147,
    "workers": 6022,
    "workersChange": 1,
    "pay": 39.6,
    "payChange": 21
   },
   {
    "name": "Farming and farm services",
    "note": "Farm service businesses only. Farms themselves aren't in this count",
    "estab": 72,
    "workers": 401,
    "workersChange": -22,
    "pay": 52.3,
    "payChange": 40
   },
   {
    "name": "Wine and beverages",
    "note": "Wineries",
    "estab": 327,
    "workers": 6159,
    "workersChange": -9,
    "pay": 83.5,
    "payChange": 32
   },
   {
    "name": "Lodging and tourism",
    "note": "Hotels and motels",
    "estab": 99,
    "workers": 2250,
    "workersChange": -26,
    "pay": 46.2,
    "payChange": 49
   },
   {
    "name": "Dental",
    "note": "",
    "estab": 282,
    "workers": 2175,
    "workersChange": 7,
    "pay": 63.3,
    "payChange": 19
   },
   {
    "name": "Health care",
    "note": "Doctors' offices",
    "estab": 245,
    "workers": 2693,
    "workersChange": -7,
    "pay": 124.0,
    "payChange": 22
   },
   {
    "name": "Mental health and counseling",
    "note": "",
    "estab": 86,
    "workers": 501,
    "workersChange": 90,
    "pay": 38.8,
    "payChange": -4
   },
   {
    "name": "Home care and elder care",
    "note": "Home health, senior services, nursing homes",
    "estab": 154,
    "workers": 5344,
    "workersChange": 12,
    "pay": 45.5,
    "payChange": 15
   },
   {
    "name": "Child care",
    "note": "",
    "estab": 152,
    "workers": 895,
    "workersChange": -5,
    "pay": 33.6,
    "payChange": 25
   },
   {
    "name": "Legal",
    "note": "",
    "estab": 241,
    "workers": 969,
    "workersChange": 5,
    "pay": 140.3,
    "payChange": 62
   },
   {
    "name": "Accounting and tax",
    "note": "CPA offices",
    "estab": 116,
    "workers": 787,
    "workersChange": 12,
    "pay": 71.4,
    "payChange": 4
   },
   {
    "name": "Beauty and personal care",
    "note": "Hair, nails, barbers",
    "estab": 211,
    "workers": 727,
    "workersChange": -8,
    "pay": 33.6,
    "payChange": 26
   },
   {
    "name": "Fitness and wellness",
    "note": "",
    "estab": 104,
    "workers": 1629,
    "workersChange": 0,
    "pay": 21.9,
    "payChange": 34
   },
   {
    "name": "Pets and vets",
    "note": "",
    "estab": 160,
    "workers": 1553,
    "workersChange": 23,
    "pay": 55.0,
    "payChange": 45
   },
   {
    "name": "Cleaning",
    "note": "Janitorial services",
    "estab": 104,
    "workers": 1043,
    "workersChange": -21,
    "pay": 32.7,
    "payChange": 23
   },
   {
    "name": "Moving and hauling",
    "note": "",
    "estab": 23,
    "workers": 137,
    "workersChange": 52,
    "pay": 53.0,
    "payChange": 31
   },
   {
    "name": "Rentals and property management",
    "note": "",
    "estab": 236,
    "workers": 1039,
    "workersChange": -10,
    "pay": 53.3,
    "payChange": 31
   },
   {
    "name": "Retail shops",
    "note": "All stores",
    "estab": 1643,
    "workers": 23004,
    "workersChange": -8,
    "pay": 43.1,
    "payChange": 27
   },
   {
    "name": "Manufacturing",
    "note": "",
    "estab": 892,
    "workers": 21134,
    "workersChange": -5,
    "pay": 89.2,
    "payChange": 22
   },
   {
    "name": "Printing and signs",
    "note": "",
    "estab": 25,
    "workers": 276,
    "workersChange": -12,
    "pay": 69.9,
    "payChange": 50
   },
   {
    "name": "Tech and computer repair",
    "note": "",
    "estab": 8,
    "workers": 28,
    "workersChange": -15,
    "pay": 104.9,
    "payChange": 118
   }
  ],
  memberData: [
    ["How many jobs people hold, their hours and pay range", "Asked at sign-up, kept private, shown only as totals"],
    ["Whether jobs pay a living wage", "From the sign-up answers, by category"],
    ["How busy each business is", "Monthly report from member businesses"],
    ["What things cost: a meal, a haircut, a plumber's hour, rent", "Prices on points payments and a monthly price check"],
    ["Where points go and how fast", "The public log, added up by category, never by person"]
  ],
  sources: [
    ["Census QuickFacts, Sonoma County", "https://www.census.gov/quickfacts/fact/table/sonomacountycalifornia/INC110219"],
    ["Census County Business Patterns, 2019 and 2023", "https://www.census.gov/programs-surveys/cbp.html"],
    ["CSLB Public Data Portal, licenses by county", "https://www.cslb.ca.gov/onlineservices/dataportal/"],
    ["BLS local area employment and metro jobs", "https://www.bls.gov/lau/"],
    ["BLS CPI, West region, June 2026", "https://www.bls.gov/regions/west/news-release/2026/consumerpriceindex_west_20260714.htm"],
    ["MIT Living Wage Calculator, Sonoma County", "https://livingwage.mit.edu/counties/06097"]
  ]
};
