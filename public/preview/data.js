// Sample data for the preview screens. None of it is real, and nothing here talks to the database.
window.SAMPLE = {
  me: {
    name: "Sam Rivera",
    county: "Fresno County, CA",
    step: 3,
    verified: { by: "Equitide (Plaid)", on: "Oct 12, 2026" },
    stats: { projects: 7, checks: 0, months: 2 },
    nextStep: {
      name: "Checker",
      needs: [
        { text: "3 months in good standing", done: 2, of: 3 },
        { text: "Short checker training", done: 0, of: 1 },
        { text: "No open disputes", done: 1, of: 1 }
      ]
    },
    // What the person can do, for matching with businesses that are hiring. Pay is left to the business and the person.
    lookingFor: { open: true, kinds: ["Temp work", "Part-time"], area: "Within 20 miles of Fresno" },
    canDo: ["Drywall repair", "Plumbing fixtures", "Interior painting", "Doors and locks"],
    certs: ["OSHA 10-hour construction", "EPA lead-safe renovator (RRP)"],
    owns: ["b1"],
    badges: [
      { icon: "🌱", name: "Seed planter", got: true },
      { icon: "🔨", name: "First project", got: true },
      { icon: "⭐", name: "5 projects done", got: true },
      { icon: "🔍", name: "Checker", got: false },
      { icon: "🛠️", name: "Operator", got: false },
      { icon: "🗝️", name: "Keeper", got: false }
    ]
  },

  businesses: [
    {
      id: "b1", name: "Rivera Handyman Services", owner: "Sam Rivera", county: "Fresno County, CA",
      license: "City of Fresno business license, checked Oct 14, 2026",
      services: ["Small home repairs", "Drywall and paint", "Plumbing fixtures", "Doors, locks and hardware"],
      size: { grossUsd: 185000, grossPts: 2400, employees: 2 },
      track: { done: 7, onTime: 6, disputes: 0, largest: 600, average: 380 },
      limit: { now: 3000, rule: "Set from yearly gross, employees and track record. Grows as projects finish on time and pass checks." },
      busy: 55,
      hiring: [
        { title: "Handyman helper", kind: "Temp, 6 weeks", note: "Basic tools, own ride" },
        { title: "Office help, 10 hrs a week", kind: "Part-time", note: "Scheduling and invoices" }
      ]
    },
    {
      id: "b2", name: "Summit Roofing", owner: "Dana Cho", county: "Fresno County, CA",
      license: "CSLB C-39 roofing license, checked Sep 30, 2026",
      services: ["Roof repair", "Gutter cleaning and repair", "Roof inspections"],
      size: { grossUsd: 1400000, grossPts: 5100, employees: 11 },
      track: { done: 12, onTime: 12, disputes: 1, largest: 2400, average: 900 },
      limit: { now: 12000, rule: "Set from yearly gross, employees and track record. Grows as projects finish on time and pass checks." },
      busy: 40,
      hiring: [{ title: "Roofing laborer", kind: "Permanent", note: "Will train" }]
    }
  ],

  // Local numbers behind funding decisions. In the real build these come from member reports and public data.
  local: {
    "Fresno County, CA": { trade: "Home repair and roofing", busy: 52, reporting: 23, lookingForWork: 31, materials: "Available" },
    "Kern County, CA": { trade: "Restaurants and food supply", busy: 68, reporting: 14, lookingForWork: 19, materials: "Available" },
    "Tulare County, CA": { trade: "Painting", busy: 47, reporting: 9, lookingForWork: 22, materials: "Available" }
  },

  types: [
    { key: "word", name: "Spread the word", blurb: "Posts, videos, podcast spots and articles. Paid mostly on results: views and pledges through your link." },
    { key: "upkeep", name: "Home upkeep", blurb: "Repairs and upkeep for landlords and business owners, funded when local repair businesses have room." },
    { key: "suppliers", name: "Bring in the suppliers", blurb: "When a business joins, reach out to its suppliers and get them signed up." },
    { key: "trainee", name: "Trainees", blurb: "Take on a trainee. The points go to your business; you pay the trainee in dollars." }
  ],

  projects: [
    {
      id: "p2", type: "upkeep", title: "Repairs on 4 rental homes", owner: "Rivera Handyman Services", ownerId: "b1", mine: true,
      client: "Oak Street Rentals", county: "Fresno County, CA", points: 600, helpers: 1, status: "working",
      desc: "Small repairs across four rental homes. Oak Street Rentals takes points as part of the rent from business tenants and spends them here.",
      milestones: [
        { title: "Walkthrough and repair list", points: 100, status: "approved", proof: ["Repair list, 4 homes", "Photo: 1214 Oak St", "Photo: 1220 Oak St"], votes: ["yes", "yes", "yes"] },
        { title: "Repairs done", points: 400, status: "todo", proof: [], votes: [] },
        { title: "Owner sign-off", points: 100, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p1", type: "word", title: "Tell the Central Valley about Dandelions", owner: "Valley Buzz Media",
      county: "Fresno County, CA", points: 1200, helpers: 3, status: "open",
      desc: "A main project for local creators. Valley Buzz plans the posts and creators start their own sub-projects under it. Every paid post says it's paid (#ad).",
      subs: ["Podcast spot: Working Class Hour", "Short videos: Fresno food spots", "Instagram series: fix-it Fridays"],
      milestones: [
        { title: "Content plan", points: 150, status: "approved", proof: ["Content plan"], votes: ["yes", "yes", "yes"] },
        { title: "10 posts live", points: 300, status: "todo", proof: [], votes: [] },
        { title: "Results: 5,000 views and 25 pledges through the link", points: 750, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p3", type: "suppliers", title: "Sign up Lupita's Kitchen suppliers", owner: "Lupita's Kitchen",
      county: "Kern County, CA", points: 300, helpers: 0, status: "open",
      desc: "Lupita's Kitchen joined last week. This project reaches out to its 8 regular suppliers: produce, meat, tortillas, paper goods and the linen service.",
      milestones: [
        { title: "Supplier list and first calls", points: 50, status: "todo", proof: [], votes: [] },
        { title: "4 suppliers signed up", points: 250, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p4", type: "trainee", title: "Paint crew trainee, 8 weeks", owner: "Bright Coat Painting",
      county: "Tulare County, CA", points: 800, helpers: 0, status: "open",
      desc: "Bright Coat takes on one trainee for 8 weeks and pays them at least minimum wage in dollars. The points go to Bright Coat as a training subsidy, for materials and costs.",
      milestones: [
        { title: "Trainee starts, training plan posted", points: 100, status: "todo", proof: [], votes: [] },
        { title: "Week 4 skills check", points: 300, status: "todo", proof: [], votes: [] },
        { title: "Week 8 skills check", points: 400, status: "todo", proof: [], votes: [] }
      ]
    },
    {
      id: "p5", type: "upkeep", title: "Gutter and roof checks before the rain", owner: "Summit Roofing", ownerId: "b2",
      county: "Fresno County, CA", points: 450, helpers: 2, status: "open",
      desc: "Clear gutters and check roofs on 12 homes owned by member businesses before the rains.",
      milestones: [
        { title: "Homes scheduled", points: 50, status: "approved", proof: ["Schedule, 12 homes"], votes: ["yes", "yes", "yes"] },
        { title: "Gutters cleared and roofs checked", points: 400, status: "review", proof: ["Before: 418 Elm gutter", "After: 418 Elm gutter", "Roof check sheet", "After: 502 Elm gutter", "Dump receipt"], votes: ["yes"] }
      ]
    }
  ],

  log: [
    { when: "Oct 27, 9:12", what: "points.released 100 to Rivera Handyman Services (p2, milestone 1, 3 of 5 checkers yes)" },
    { when: "Oct 27, 8:40", what: "check.vote checker 77: yes (p2, milestone 1)" },
    { when: "Oct 26, 16:03", what: "milestone.proof_added p2 milestone 1, 3 files" },
    { when: "Oct 25, 10:30", what: "project.posted p2 home upkeep, 3 milestones, 600 points" }
  ]
};
