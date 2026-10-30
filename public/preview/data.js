// Sample data for the preview screens. People, businesses and projects are made up, and nothing here talks to the database.
// The setting is Sonoma County, CA a few weeks after it reached 1% and points turned on. County numbers come from raindy-data.js.
window.SAMPLE = {
  me: {
    name: "Sam Rivera",
    county: "Sonoma County, CA",
    town: "Santa Rosa",
    step: 3,
    verified: { by: "Equitide (Plaid)", on: "Sep 12, 2026" },
    stats: { projects: 1, checks: 0, months: 2 },
    nextStep: {
      name: "Checker",
      needs: [
        { text: "3 months in good standing", done: 2, of: 3 },
        { text: "Short checker training", done: 0, of: 1 },
        { text: "No open disputes", done: 1, of: 1 }
      ]
    },
    // What the person can do, for matching with businesses that are hiring. Pay is left to the business and the person.
    lookingFor: { open: true, kinds: ["Temp work", "Part-time"], area: "Within 20 miles of Santa Rosa" },
    canDo: ["Drywall repair", "Plumbing fixtures", "Interior painting", "Doors and locks"],
    certs: ["OSHA 10-hour construction", "EPA lead-safe renovator (RRP)"],
    // Optional and private. Only county totals are ever shown, never one person's answers.
    work: { jobs: 1, hours: "40 to 50 a week", pay: "$25 to $35 an hour" },
    owns: ["b1"],
    badges: [
      { icon: "🌱", name: "Seed planter", got: true },
      { icon: "🔨", name: "First project", got: true },
      { icon: "⭐", name: "5 projects done", got: false },
      { icon: "🔍", name: "Checker", got: false },
      { icon: "🛠️", name: "Operator", got: false },
      { icon: "🗝️", name: "Keeper", got: false }
    ]
  },

  // Where Sonoma County stands. Points start only when a county reaches 1% on its own.
  launch: {
    place: "Sonoma County, CA", stage: "Sprout", icon: "🌱", pct: 1.0, members: 4902, businesses: 593,
    reached: "Oct 5, 2026", nextStage: "Bloom", nextPct: 5,
    budget: { month: 20000, used: 6450, rule: "Set from what member businesses can spend at each other each month. It grows as more places to spend join." },
    open: ["word", "run"],
    openWhy: "At 1%, the first projects build Dandelions itself: getting the word out, signing up businesses and running the system.",
    later: "Pay to train and Common good open later, when members vote them in."
  },

  businesses: [
    {
      id: "b1", name: "Rivera Handyman Services", owner: "Sam Rivera", county: "Sonoma County, CA", town: "Santa Rosa",
      license: "City of Santa Rosa business tax certificate, checked Sep 14, 2026",
      services: ["Small home repairs", "Drywall and paint", "Plumbing fixtures", "Doors, locks and hardware"],
      size: { grossUsd: 185000, grossPts: 240, employees: 2 },
      track: { done: 1, onTime: 1, disputes: 0, largest: 300, average: 300 },
      limit: { now: 800, rule: "Set from yearly gross, employees and track record. Grows as projects finish on time and pass checks." },
      busy: 55, insured: true, tradeLicenses: [],
      hiring: [
        { title: "Handyman helper", kind: "Temp, 6 weeks", note: "Basic tools, own ride" },
        { title: "Office help, 10 hrs a week", kind: "Part-time", note: "Scheduling and invoices" }
      ]
    },
    {
      id: "b2", name: "Bright Coat Painting", owner: "Dana Cho", county: "Sonoma County, CA", town: "Petaluma",
      license: "CSLB C-33 painting license, checked Sep 30, 2026",
      services: ["Interior and exterior painting", "Deck staining", "Small drywall repair"],
      size: { grossUsd: 920000, grossPts: 610, employees: 8 },
      track: { done: 2, onTime: 2, disputes: 0, largest: 400, average: 350 },
      limit: { now: 1500, rule: "Set from yearly gross, employees and track record. Grows as projects finish on time and pass checks." },
      busy: 70, insured: true, tradeLicenses: ["CSLB C-33 painting"],
      hiring: [{ title: "Painter's helper", kind: "Permanent", note: "Will train" }]
    }
  ],

  // Local numbers members report. Early on few businesses report, so the numbers are rough.
  local: {
    "Sonoma County, CA": { busy: 62, reporting: 118, lookingForWork: 340, materials: "Available" },
    "California": { busy: 62, reporting: 131, lookingForWork: 610, materials: "Available" },
    "Nationwide": { busy: 60, reporting: 204, lookingForWork: 1450, materials: "Available" }
  },

  // The three area levels on the Work page, and the bar a business has to clear to run projects at each one.
  areas: [
    { key: "county", name: "Sonoma County, CA", short: "County", need: { done: 0, onTime: 0, open: 2 }, typical: "Up to your size limit" },
    { key: "state", name: "California", short: "State", need: { done: 5, onTime: 80, open: 3 }, typical: "Usually 1,000 to 5,000 points" },
    { key: "nation", name: "Nationwide", short: "Nationwide", need: { done: 15, onTime: 90, open: 3 }, typical: "Usually 3,000 points and up" }
  ],

  // Categories under each project type. "open" lists the area levels where there's room for it right now.
  categories: {
    train: [
      { name: "Trade helper", open: [], onsite: true, max: 1200, why: "Opens later, when members vote it in" },
      { name: "Restaurant kitchen trainee", open: [], onsite: true, max: 900, why: "Opens later, when members vote it in" },
      { name: "Automation tech trainee", open: [], onsite: true, max: 2000, why: "Opens later, when members vote it in" }
    ],
    common: [
      { name: "Creek cleanup", open: [], onsite: true, max: 2500, why: "Opens later, when members vote it in" },
      { name: "Trail upkeep", open: [], onsite: true, max: 3000, why: "Opens later, when members vote it in" },
      { name: "Wildfire brush clearing for seniors", open: [], onsite: true, max: 8000, why: "Opens later, when members vote it in" }
    ],
    word: [
      { name: "Social posts and video", open: ["county", "state", "nation"], onsite: false, max: 1200 },
      { name: "Podcast and radio spots", open: ["county", "state", "nation"], onsite: false, max: 1500 },
      { name: "Sign up a business's suppliers", open: ["county"], onsite: false, max: 400 },
      { name: "Sign-up tables at markets and events", open: ["county"], onsite: true, max: 600 }
    ],
    run: [
      { name: "Help desk and moderation", open: ["county", "state", "nation"], onsite: false, max: 800 },
      { name: "Member data and reports", open: ["county", "state", "nation"], onsite: false, max: 1200 },
      { name: "ID checks", open: ["nation"], onsite: false, max: 2000, why: "Run nationwide only" },
      { name: "Hosting and nodes", open: ["nation"], onsite: false, max: 9000, why: "Run nationwide only" }
    ]
  },

  // How each type splits its points into milestones when you start one. Owners can rename steps.
  milestoneTemplates: {
    train: [["Trainee starts, training plan posted", 0.15], ["Halfway skills check", 0.35], ["Final skills check", 0.5]],
    common: [["Plan and map posted", 0.1], ["Work done, before and after photos", 0.9]],
    word: [["Outreach plan", 0.15], ["Posts, calls or tables done", 0.25], ["Results: confirmed sign-ups", 0.6]],
    run: [["First month", 0.34], ["Second month", 0.33], ["Third month", 0.33]]
  },

  // What points are created for. Regular jobs between businesses (like repairs for a landlord) aren't funded;
  // they're paid in points or dollars through the directory.
  types: [
    { key: "word", name: "Spread the word", blurb: "Posts, videos, podcast spots, sign-up tables and signing up a business's suppliers. Paid mostly on confirmed sign-ups." },
    { key: "run", name: "Run Dandelions", blurb: "The work of running the system: help desk, member data, ID checks, proof checks, hosting." },
    { key: "train", name: "Pay to train", blurb: "Take on someone who wants to learn a trade. Your business gets points to cover training; you pay the trainee in dollars." },
    { key: "common", name: "Common good", blurb: "Work usually paid for by taxes or charity that isn't getting done: creeks, trails, brush clearing, public spaces." }
  ],

  projects: [
    {
      id: "p2", level: "county", type: "word", title: "Sign up my suppliers", owner: "Rivera Handyman Services", ownerId: "b1", mine: true,
      county: "Sonoma County, CA", points: 300, helpers: 0, status: "working",
      desc: "Rivera reaches out to the 6 places it buys from every month: the lumber yard, plumbing supply, paint store, tool rental, dump and bookkeeper. When they join, Rivera can spend the points it earns where it already shops.",
      milestones: [
        { title: "Supplier list and first calls", points: 50, status: "approved", proof: ["List of 6 suppliers", "Call notes"], votes: ["yes", "yes", "yes"] },
        { title: "3 suppliers signed up and taking points", points: 250, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p5", level: "county", type: "word", title: "Sign-up table at the Santa Rosa farmers market", owner: "Bright Coat Painting", ownerId: "b2",
      county: "Sonoma County, CA", points: 480, helpers: 2, status: "working",
      desc: "Four Saturdays at a table at the downtown market. People sign up on their own phones. Bright Coat is paid for the table and for each sign-up that confirms by email. No one is promised jobs or points for joining.",
      milestones: [
        { title: "Table plan and dates", points: 40, status: "approved", proof: ["Market booth permit", "Flyer"], votes: ["yes", "yes", "yes"] },
        { title: "First 2 Saturdays: 31 confirmed sign-ups", points: 220, status: "review", proof: ["Table, Oct 17", "Table, Oct 24", "Flyer up close", "Sign-up count from the app"], votes: ["yes"] },
        { title: "Last 2 Saturdays", points: 220, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p1", level: "county", type: "word", title: "Tell Sonoma County about Dandelions", owner: "Laguna Creek Media",
      county: "Sonoma County, CA", points: 1200, helpers: 3, status: "open",
      desc: "A main project for local creators. Laguna Creek plans the posts and creators start their own sub-projects under it. Every paid post says it's paid (#ad). Paid mostly on sign-ups through each creator's link.",
      subs: ["Podcast spot: North Bay small business show", "Short videos: Santa Rosa lunch spots that take points", "Instagram series: Fix-it Fridays"],
      milestones: [
        { title: "Content plan", points: 100, status: "approved", proof: ["Content plan"], votes: ["yes", "yes", "yes"] },
        { title: "10 posts live, each marked #ad", points: 300, status: "todo", proof: [], votes: [] },
        { title: "Results: 50 confirmed sign-ups through the links", points: 800, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p3", level: "county", type: "word", title: "Sign up Lupita's Kitchen suppliers", owner: "Lupita's Kitchen",
      county: "Sonoma County, CA", points: 300, helpers: 0, status: "open",
      desc: "Lupita's Kitchen in Roseland joined last week. This project reaches out to its 8 regular suppliers: produce, meat, tortillas, paper goods and the linen service.",
      milestones: [
        { title: "Supplier list and first calls", points: 50, status: "todo", proof: [], votes: [] },
        { title: "4 suppliers signed up", points: 250, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p4", level: "county", type: "run", title: "Sonoma help desk, first 3 months", owner: "Cotati Office Help",
      county: "Sonoma County, CA", points: 600, helpers: 1, status: "working",
      desc: "Answer member questions by email and chat, in English and Spanish, and keep the Sonoma Talk room friendly. Monthly report of questions asked, with no names.",
      milestones: [
        { title: "First month", points: 200, status: "approved", proof: ["Monthly report: 412 questions answered"], votes: ["yes", "yes", "yes"] },
        { title: "Second month", points: 200, status: "todo", proof: [], votes: [] },
        { title: "Third month", points: 200, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p7", level: "county", type: "run", title: "Find out why restaurants can't hire", owner: "North Bay Field Research",
      county: "Sonoma County, CA", points: 900, helpers: 2, status: "open",
      desc: "Sit-down restaurants here have about 10% fewer workers than in 2019. Talk to 40 restaurant owners and 60 people who left restaurant work, and post what they say. Raindy adds the results to its data.",
      milestones: [
        { title: "Questions posted for comment", points: 150, status: "todo", proof: [], votes: [] },
        { title: "100 interviews done", points: 450, status: "todo", proof: [], votes: [] },
        { title: "Report posted, no names", points: 300, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "ps1", level: "state", type: "word", title: "California small business podcast tour", owner: "Golden State Audio",
      county: "California", points: 3000, helpers: 0, status: "open",
      desc: "Spots on 12 California podcasts that small business owners listen to. Each spot says it's paid. Paid mostly on confirmed sign-ups through the show's link.",
      milestones: [
        { title: "Shows picked and booked", points: 300, status: "approved", proof: ["List of 12 shows"], votes: ["yes", "yes", "yes"] },
        { title: "All 12 spots aired", points: 900, status: "todo", proof: [], votes: [] },
        { title: "Results: confirmed sign-ups through the links", points: 1800, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "pn1", level: "nation", type: "run", title: "Public log viewer anyone can check", owner: "Open Ledger Co-op",
      county: "Nationwide", points: 8000, helpers: 0, status: "open",
      desc: "Build a simple open-source page where anyone can read the public log and check the daily fingerprint for themselves.",
      milestones: [
        { title: "Design posted for comment", points: 1000, status: "todo", proof: [], votes: [] },
        { title: "Working viewer, open source", points: 4000, status: "todo", proof: [], votes: [] },
        { title: "Three months running", points: 3000, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p6", level: "nation", type: "run", title: "ID checks for new members", owner: "Equitide",
      county: "Nationwide", points: 900, helpers: 0, status: "working",
      desc: "Equitide runs ID checks through Plaid and sends Dandelions only a yes or no for each person. Paid per batch of completed checks.",
      milestones: [
        { title: "October checks", points: 300, status: "approved", proof: ["Batch report, no personal info"], votes: ["yes", "yes", "yes"] },
        { title: "November checks", points: 300, status: "todo", proof: [], votes: [] },
        { title: "December checks", points: 300, status: "todo", proof: [], votes: [] }
      ]
    }
  ],

  // A few of the county's member businesses. "kind" groups them for the filter.
  directory: [
    { name: "Rivera Handyman Services", id: "b1", kind: "Home and repair", county: "Santa Rosa", services: "Small home repairs, drywall, plumbing fixtures", takes: "Points or dollars", offer: "10% off repairs paid in points" },
    { name: "Bright Coat Painting", id: "b2", kind: "Home and repair", county: "Petaluma", services: "Interior and exterior painting, decks", takes: "Points or dollars" },
    { name: "Corner Lumber and Supply", kind: "Home and repair", county: "Santa Rosa", services: "Lumber, hardware, tool rental", takes: "Up to 500 points a month" },
    { name: "Lupita's Kitchen", kind: "Food", county: "Santa Rosa", services: "Restaurant and catering", takes: "Points or dollars", offer: "Free agua fresca with a meal paid in points" },
    { name: "Roseland Corner Market", kind: "Food", county: "Santa Rosa", services: "Groceries, produce, meat counter", takes: "Up to 20% of a bill in points" },
    { name: "Gravenstein Bakery", kind: "Food", county: "Sebastopol", services: "Bread, pastries, coffee", takes: "Points or dollars", offer: "Day-old bread half off in points" },
    { name: "Mill Street Barbers", kind: "Personal care", county: "Healdsburg", services: "Haircuts and shaves", takes: "Points or dollars", offer: "Fifth cut free in points" },
    { name: "Laguna Creek Media", kind: "Office and media", county: "Sebastopol", services: "Social media and video", takes: "Points or dollars" },
    { name: "Cotati Office Help", kind: "Office and media", county: "Cotati", services: "Bookkeeping, scheduling, help desk", takes: "Points or dollars" },
    { name: "Oak Street Rentals", kind: "Rentals", county: "Santa Rosa", services: "Rental homes and small offices", takes: "Up to 10% of rent in points" },
    { name: "Stony Point Auto", kind: "Auto", county: "Rohnert Park", services: "Brakes, tires, oil changes", takes: "Up to 300 points a month" },
    { name: "Two Rock Pet Care", kind: "Pets", county: "Petaluma", services: "Dog walking, pet sitting", takes: "Points or dollars" }
  ],


  wallet: {
    business: { name: "Rivera Handyman Services", balance: 310 },
    // Each business sets how many points it will take in a month, and raises it as more places to spend join.
    cap: { month: 1000, taken: 240, spendHere: 41 },
    personal: { name: "Sam Rivera", balance: 60 },
    history: [
      { when: "Oct 27", what: "From Dandelions: Sign up my suppliers, milestone 1", amt: 50, wallet: "business" },
      { when: "Oct 24", what: "From Oak Street Rentals: repairs, 1220 Oak St", amt: 240, wallet: "business" },
      { when: "Oct 22", what: "To Corner Lumber and Supply: drywall and screws", amt: -120, wallet: "business" },
      { when: "Oct 20", what: "From a member: old mountain bike", amt: 60, wallet: "personal" },
      { when: "Oct 18", what: "To Lupita's Kitchen: lunch for the crew", amt: -45, wallet: "business" }
    ]
  },

  talk: {
    rooms: [
      { name: "Sonoma County", members: 1240, new: 11 },
      { name: "Santa Rosa", members: 610, new: 4 },
      { name: "Petaluma", members: 220, new: 2 },
      { name: "California", members: 1980, new: 6 },
      { name: "Everyone, nationwide", members: 5120, new: 23 },
      { name: "Topic: What opens next", members: 740, new: 9 }
    ],
    ideas: [
      { id: "i1", title: "Open Pay to train in Sonoma County next", by: "Dana C.", backers: 182, need: 250, weight: "Heavy", scope: "Sonoma County, CA", replies: 64 },
      { id: "i2", title: "Add a sign-up table at the Petaluma market", by: "Marcus T.", backers: 7, need: 10, weight: "Light", scope: "Sonoma County, CA", replies: 5 },
      { id: "i3", title: "Add \"automation tech trainee\" as a Pay to train category", by: "Lupe R.", backers: 64, need: 100, weight: "Heavy", scope: "Nationwide", replies: 31 }
    ],
    ballot: { title: "Raise Sonoma County's monthly point budget from 20,000 to 30,000", weight: "Light", rule: "Proposed by the Sonoma data analysts, who voted 4 to 1 for it. Passes with 51% of votes cast", yes: 312, no: 88, ends: "Nov 4" }
  },

  dispute: {
    id: "1007", title: "Posts milestone sent back", county: "Sonoma County, CA",
    sides: ["Laguna Creek Media", "Checker panel for p1"],
    claim: "The panel said 3 of the 10 posts didn't say they were paid. Laguna says the #ad was in the video itself, and has since added it to the captions too.",
    steps: [
      { name: "Filed", when: "Oct 20", done: true },
      { name: "Talk it out (7 days)", when: "Oct 20 to 27", done: true, note: "No agreement" },
      { name: "Screening", when: "Oct 28", done: true, note: "Sent to a panel" },
      { name: "Panel of 3 random checkers", when: "Decides by Nov 3", now: true },
      { name: "Ruling posted", when: "" },
      { name: "One appeal, if asked for", when: "" }
    ],
    evidence: ["Screenshots of the 3 posts", "The videos, with #ad on screen", "Captions after the fix", "Panel notes from Oct 19"],
    frozen: 300
  },

  // Sign-up: visitor > verified member > business. Dandelions keeps the yes and the date from the ID check, never ID papers.
  join: {
    agreement: [
      "Points are for verified work and trade between members. They have no cash value, and Dandelions never buys or sells them.",
      "I won't use points to pay anyone's wages. Wages are paid in dollars.",
      "One person, one account, one vote.",
      "What I post as proof is real, and I took it or have the right to share it.",
      "I'll settle disagreements through the dispute steps first, and rulings apply to points and permissions only.",
      "I'm 18 or older."
    ],
    licenseTypes: ["City or county business license", "State contractor license (like CSLB)", "Other state trade or professional license"]
  },

  // An operator runs a node, a distribution account and file storage, as a Run Dandelions project.
  operator: {
    name: "North Bay Node Co-op", since: "Oct 2026", pay: 400,
    node: { uptime: 99.94, entries: 48210, peers: 3, lastPrint: "Oct 29, 11:59 pm", print: "9f3a 61d0 … 7c21 e04b" },
    account: { balance: 18400, min: 10000, max: 40000, start: 20000 },
    storage: { gb: 4, files: 1630, copies: 3 },
    payouts: [
      { when: "Oct 29", what: "Rivera Handyman Services, p2 milestone 1", amt: -50 },
      { when: "Oct 28", what: "Equitide, p6 October checks", amt: -300 },
      { when: "Oct 27", what: "Check fees, 9 checks", amt: -195 },
      { when: "Oct 25", what: "Cotati Office Help, p4 first month", amt: -200 }
    ],
    become: ["Checker for a year in good standing", "A small always-on server and a backup", "Sign the operator agreement", "Picked by member vote, with no more than 2 operators per state"]
  },

  // Sample charter wording, only to show how changes work. The real charter is the Dandelions Charter.
  charter: {
    version: "1.0", adopted: "Oct 2026", print: "a71c 9e02 … 52f0 04be",
    principles: [
      "There's plenty to do. Points are created only for verified work.",
      "Points created are capped by the workers and materials available locally. The market comes first.",
      "AI shows the data. People decide. Code pays only for verified work.",
      "One person, one vote. Votes are free and can't be bought or sold.",
      "Every step goes on the public log, with no personal info.",
      "No one holds ID papers. ID checks send back only yes or no."
    ],
    proposal: {
      title: "Add a principle: Dandelions never runs or promotes a dollar exchange for points",
      by: "Keeper seat 3", backers: 1010, need: 930,
      yes: 5230, no: 910, turnout: 33, needTurnout: 25, needYes: 75,
      waitEnds: "Nov 28", signed: 0, signNeed: 2, seats: 9,
      steps: ["5% of members back it", "Open discussion, 14 days", "Vote: 75% yes, 25% turnout", "30-day wait", "Keepers sign (2 of 3)", "Live, new fingerprint posted"], at: 3
    },
    keepers: [
      { seat: 1, who: "Founder", note: "Founder seat, handed off by 2028", ends: "2028" },
      { seat: 2, who: "Dana C.", note: "Picked by the founder for the first term", ends: "2027" },
      { seat: 3, who: "Marcus T.", note: "Picked by the founder for the first term", ends: "2027" },
      { seat: 4, who: "Open", note: "Seats open as members grow", ends: "" },
      { seat: 5, who: "Open", note: "", ends: "" },
      { seat: 6, who: "Open", note: "", ends: "" },
      { seat: 7, who: "Open", note: "", ends: "" },
      { seat: 8, who: "Open", note: "", ends: "" },
      { seat: 9, who: "Open", note: "", ends: "" }
    ],
    fast: {
      title: "Paused payouts on one project after repeat sign-ups", by: "3 of 3 keepers", when: "Oct 26", expires: "Nov 25",
      why: "Raindy and two checkers found 14 sign-ups made from the same phone in one hour. Payouts paused so no points go out while it's looked at. Nothing else changed.",
      yes: 402, no: 31
    }
  },

  // Places for the stats drill-down. Stage: Seed (first pledge), Sprout 1%, Bloom 5%, Puffball 10%. Members here are verified members.
  places: [
    { id: "us", name: "Nationwide", parent: null, members: 18600, pct: 5.5e-05, businesses: 1420, busy: 60, looking: 1450, open: 3, created: 8250, retired: 0, note: "Sonoma County is the only county at 1% so far. Nationwide projects are Run Dandelions work like ID checks." },
    { id: "ca", name: "California", parent: "us", members: 9400, pct: 0.00024, businesses: 790, busy: 62, looking: 610, open: 1, created: 6450, retired: 0, note: "One county at 1%. Marin and Napa are next closest." },
    { id: "tx", name: "Texas", parent: "us", members: 1100, pct: 3.6e-05, businesses: 70, busy: 0, looking: 0, open: 0, created: 0, retired: 0, note: "No county at 1% yet, so no points here." },
    { id: "or", name: "Oregon", parent: "us", members: 820, pct: 0.00019, businesses: 61, busy: 0, looking: 0, open: 0, created: 0, retired: 0, note: "No county at 1% yet, so no points here." },
    { id: "sonoma", name: "Sonoma County, CA", parent: "ca", members: 4902, pct: 0.01, businesses: 593, busy: 62, looking: 340, open: 6, created: 6450, retired: 0, note: "Reached 1% on Oct 5, 2026. Points turned on that day." },
    { id: "marin", name: "Marin County, CA", parent: "ca", members: 610, pct: 0.0024, businesses: 48, busy: 0, looking: 0, open: 0, created: 0, retired: 0, note: "Needs about 2,560 members for 1%." },
    { id: "napa", name: "Napa County, CA", parent: "ca", members: 420, pct: 0.0031, businesses: 36, busy: 0, looking: 0, open: 0, created: 0, retired: 0, note: "Needs about 1,340 members for 1%." },
    { id: "la", name: "Los Angeles County, CA", parent: "ca", members: 900, pct: 9e-05, businesses: 52, busy: 0, looking: 0, open: 0, created: 0, retired: 0, note: "Needs about 97,000 members for 1%." },
    { id: "santarosa", name: "Santa Rosa", parent: "sonoma", members: 2050, pct: 0.0116, businesses: 268, busy: 63, looking: 160, open: 4, created: 3900, retired: 0, note: "Most of the county's members and businesses so far." },
    { id: "petaluma", name: "Petaluma", parent: "sonoma", members: 640, pct: 0.0108, businesses: 84, busy: 66, looking: 41, open: 1, created: 980, retired: 0, note: "Painting and repair businesses joined early." },
    { id: "rohnert", name: "Rohnert Park and Cotati", parent: "sonoma", members: 520, pct: 0.0092, businesses: 57, busy: 58, looking: 52, open: 1, created: 820, retired: 0, note: "The help desk project is run from here." },
    { id: "westcounty", name: "Sebastopol and west county", parent: "sonoma", members: 610, pct: 0.0097, businesses: 92, busy: 55, looking: 38, open: 0, created: 450, retired: 0, note: "Lots of one-person businesses." },
    { id: "northcounty", name: "Windsor, Healdsburg and north county", parent: "sonoma", members: 580, pct: 0.0081, businesses: 62, busy: 68, looking: 31, open: 0, created: 220, retired: 0, note: "Wineries are joining slowly." },
    { id: "sonomavalley", name: "Sonoma Valley", parent: "sonoma", members: 502, pct: 0.01, businesses: 30, busy: 64, looking: 18, open: 0, created: 80, retired: 0, note: "Few businesses yet." }
  ],

  // Checker work. Checking is "Run Dandelions" work, so the fee goes to the checker's business, yes or no.
  checks: {
    course: [
      { title: "What a check is", text: "A business says a milestone is done. You go look, take your own photos and say what you saw. You're not the boss of the project. You're a fair pair of eyes." },
      { title: "Who you can't check", text: "Your own business, your customers, your suppliers, your competitors, family and friends. If a ticket comes to you by mistake, pass on it and say why." },
      { title: "Taking proof", text: "Photograph what the checklist asks for, in daylight, with the whole thing in the frame. The app adds the time and place. No faces, no house numbers, no license plates." },
      { title: "Saying no", text: "\"Needs work\" is not a punishment. Say exactly what's missing so the business can fix it. You get paid the same for yes or no, so just call it like you see it." },
      { title: "Staying safe", text: "Don't climb, enter private property without the owner, or go after dark. If a site isn't safe, stop and report it. That still counts as a finished check." }
    ],
    quiz: [
      { q: "A ticket is for your brother-in-law's business. What do you do?", a: ["Take it, you know the work is good", "Pass and say it's family"], right: 1 },
      { q: "Do you get paid more for saying yes?", a: ["Yes, a little", "No, same fee either way"], right: 1 },
      { q: "The checklist asks for a photo of the flyer, but the table ran out.", a: ["Use the owner's photo instead", "Say so in your notes and photograph what you can"], right: 1 },
      { q: "When do you see the other checkers' answers?", a: ["After you send yours", "Before, so you can match them"], right: 0 },
      { q: "Who decides if the work gets paid?", a: ["The AI", "The checkers"], right: 1 }
    ],
    tickets: [
      {
        id: "t1", project: "p5", milestone: 1, owner: "Bright Coat Painting", title: "Sign-up table, first 2 Saturdays", type: "word",
        where: "Downtown Santa Rosa, 2 miles away", how: "On site", fee: 25, by: "Nov 2", offered: 5, taken: 1,
        what: "Visit the table this Saturday between 9 and 11 am. Photograph it and check each item. The sign-up count is checked by the app.",
        items: ["Table is staffed and has the Dandelions sign", "Flyer says points have no cash value", "People sign up on their own phones, no paper forms", "No one is promised jobs or pay"]
      },
      {
        id: "t2", project: "p1", milestone: 1, owner: "Laguna Creek Media", title: "10 posts live", type: "word",
        where: "Online", how: "Online", fee: 15, by: "Nov 6", offered: 5, taken: 0,
        what: "Open each of the 10 posts from the list. Check each one is live, says it's paid and uses the creator's sign-up link.",
        items: ["All 10 posts are live", "Each says #ad or \"paid\"", "Each link goes to the Dandelions sign-up page", "No promises of jobs, pay or returns"]
      },
      {
        id: "t3", project: "p6", milestone: 1, owner: "Equitide", title: "November ID check batch", type: "run",
        where: "Online", how: "Online", fee: 15, by: "Dec 3", offered: 5, taken: 2,
        what: "Compare the batch report with the sign-up log. Counts should match and the report should hold no personal info.",
        items: ["Count matches the log", "No names, IDs or addresses in the report", "Every yes has a date"]
      }
    ],
    hiddenMine: 1,
    // Checkers so far in the county. Early on there are few, so tickets can go a little farther out.
    pool: { checkers: 46, place: "Sonoma County" },
    // What the other two checkers on t1 said. Sample only.
    others: [
      { who: "Checker 214", vote: "yes", note: "Table staffed, sign up, flyers fine. Busy morning." },
      { who: "Checker 88", vote: "yes", note: "All good. Photos attached." }
    ],
    // What the AI looks at once all three checks are in. It points things out; people decide.
    ai: [
      { ok: true, text: "Every photo was taken at the market, during market hours" },
      { ok: true, text: "The app counts 31 confirmed sign-ups from the table's link" },
      { ok: true, text: "No photo has been used before, on this or any other project" },
      { ok: true, text: "All three checkers saw the same thing" }
    ],
    aiFlag: { ok: false, text: "4 sign-ups came from one phone within 10 minutes. They don't count until each person confirms their own email and ID." },
    me: { done: 0, agree: null, earned: 0 }
  },

  log: [
    { when: "Oct 27, 9:12", what: "points.released 50 to Rivera Handyman Services (p2, milestone 1, 3 of 5 checkers yes)" },
    { when: "Oct 27, 8:40", what: "check.vote checker 77: yes (p2, milestone 1)" },
    { when: "Oct 26, 16:03", what: "milestone.proof_added p2 milestone 1, 2 files" },
    { when: "Oct 25, 10:30", what: "project.posted p2 spread the word, 2 milestones, 300 points" },
    { when: "Oct 5, 0:00", what: "county.stage Sonoma County, CA reached 1% (Sprout). Points on, budget 20,000 a month" }
  ]
};
