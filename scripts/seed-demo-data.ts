import { PrismaClient, MemberRole, Priority, TaskStatus, ActivityType } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import crypto from "crypto";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "DemoPassword123!";

function makeTiptapJson(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text,
          },
        ],
      },
    ],
  };
}

async function seedWorkspace(workspace: any, primaryOwner: any, primaryMember: any) {
  console.log(`\n--- Seeding workspace: ${workspace.name} (${workspace.id}) ---`);

  // Ensure Default Sales Pipeline and Stages
  let pipeline = await prisma.pipeline.findFirst({
    where: { workspaceId: workspace.id, isDefault: true },
    include: { stages: true },
  });

  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        name: "Sales Pipeline",
        isDefault: true,
        workspaceId: workspace.id,
      },
      include: { stages: true },
    });
    console.log(`✓ Created sales pipeline for ${workspace.name}`);
  }

  const STAGE_DEFS = [
    { name: "Lead", color: "#8174f8", position: 0, probability: 10 },
    { name: "Qualified", color: "#53b1fd", position: 1, probability: 25 },
    { name: "Proposal", color: "#fec84b", position: 2, probability: 50 },
    { name: "Negotiation", color: "#f97066", position: 3, probability: 75 },
    { name: "Won", color: "#32d583", position: 4, probability: 100 },
    { name: "Lost", color: "#667085", position: 5, probability: 0 },
  ];

  const stageMap = new Map<string, string>();

  for (const s of STAGE_DEFS) {
    let stage = await prisma.pipelineStage.findFirst({
      where: {
        pipelineId: pipeline.id,
        name: s.name,
      },
    });

    if (!stage) {
      stage = await prisma.pipelineStage.create({
        data: {
          name: s.name,
          color: s.color,
          position: s.position,
          probability: s.probability,
          pipelineId: pipeline.id,
          workspaceId: workspace.id,
        },
      });
    }
    stageMap.set(s.name, stage.id);
  }

  // Seed Companies
  const companiesData = [
    {
      name: "Stripe Technologies",
      domain: "stripe.com",
      industry: "Financial Technology",
      city: "San Francisco",
      address: "354 Oyster Point Blvd, South San Francisco, CA",
      linkedInUrl: "https://linkedin.com/company/stripe",
      annualRevenue: 14000000000,
      employeeCount: 8000,
      deletedAt: null,
    },
    {
      name: "Vercel Cloud Inc",
      domain: "vercel.com",
      industry: "Cloud & Developer Tools",
      city: "San Francisco",
      address: "440 N Barranca Ave, Covina, CA",
      linkedInUrl: "https://linkedin.com/company/vercel",
      annualRevenue: 150000000,
      employeeCount: 550,
      deletedAt: null,
    },
    {
      name: "Datadog Observability",
      domain: "datadoghq.com",
      industry: "Monitoring & Security",
      city: "New York",
      address: "620 8th Ave, New York, NY",
      linkedInUrl: "https://linkedin.com/company/datadog",
      annualRevenue: 2100000000,
      employeeCount: 5200,
      deletedAt: null,
    },
    {
      name: "Snowflake Data Corp",
      domain: "snowflake.com",
      industry: "Cloud Data Platform",
      city: "Bozeman",
      address: "106 East Babcock Street, Bozeman, MT",
      linkedInUrl: "https://linkedin.com/company/snowflake-computing",
      annualRevenue: 2800000000,
      employeeCount: 7000,
      deletedAt: null,
    },
    {
      name: "Linear Systems",
      domain: "linear.app",
      industry: "Product Management",
      city: "San Francisco",
      address: "548 Market St, San Francisco, CA",
      linkedInUrl: "https://linkedin.com/company/linear-app",
      annualRevenue: 30000000,
      employeeCount: 120,
      deletedAt: null,
    },
    {
      name: "Figma Design Labs",
      domain: "figma.com",
      industry: "Design & Collaboration",
      city: "San Francisco",
      address: "767 Sansome St, San Francisco, CA",
      linkedInUrl: "https://linkedin.com/company/figma",
      annualRevenue: 600000000,
      employeeCount: 1300,
      deletedAt: null,
    },
    {
      name: "Supabase Platform",
      domain: "supabase.com",
      industry: "Backend as a Service",
      city: "Singapore",
      address: "Marina Bay Financial Centre, Singapore",
      linkedInUrl: "https://linkedin.com/company/supabase",
      annualRevenue: 35000000,
      employeeCount: 160,
      deletedAt: null,
    },
    {
      name: "Retool Automation",
      domain: "retool.com",
      industry: "Internal Tools",
      city: "San Francisco",
      address: "1055 Mission St, San Francisco, CA",
      linkedInUrl: "https://linkedin.com/company/retool-inc",
      annualRevenue: 100000000,
      employeeCount: 400,
      deletedAt: null,
    },
    {
      name: "Cloudflare Network",
      domain: "cloudflare.com",
      industry: "Cloud & Cybersecurity",
      city: "San Francisco",
      address: "101 Townsend St, San Francisco, CA",
      linkedInUrl: "https://linkedin.com/company/cloudflare",
      annualRevenue: 1300000000,
      employeeCount: 3800,
      deletedAt: null,
    },
    {
      name: "Postman API Labs",
      domain: "postman.com",
      industry: "Developer Tools",
      city: "San Francisco",
      address: "201 Mission St, San Francisco, CA",
      linkedInUrl: "https://linkedin.com/company/postman-platform",
      annualRevenue: 180000000,
      employeeCount: 850,
      deletedAt: null,
    },
    {
      name: "HashiCorp Cloud",
      domain: "hashicorp.com",
      industry: "DevOps & Infrastructure",
      city: "San Francisco",
      address: "101 2nd St, San Francisco, CA",
      linkedInUrl: "https://linkedin.com/company/hashicorp",
      annualRevenue: 580000000,
      employeeCount: 2200,
      deletedAt: null,
    },
    {
      name: "MongoDB Global",
      domain: "mongodb.com",
      industry: "Database Systems",
      city: "New York",
      address: "1633 Broadway, New York, NY",
      linkedInUrl: "https://linkedin.com/company/mongodbinc",
      annualRevenue: 1700000000,
      employeeCount: 4800,
      deletedAt: null,
    },
    {
      name: "Ramp Financial",
      domain: "ramp.com",
      industry: "Fintech & Corporate Cards",
      city: "New York",
      address: "28 W 23rd St, New York, NY",
      linkedInUrl: "https://linkedin.com/company/ramp-financial",
      annualRevenue: 300000000,
      employeeCount: 900,
      deletedAt: null,
    },
    {
      name: "Brex Corporate",
      domain: "brex.com",
      industry: "Fintech & Spend Management",
      city: "Salt Lake City",
      address: "1250 S 500 W, Salt Lake City, UT",
      linkedInUrl: "https://linkedin.com/company/brexhq",
      annualRevenue: 280000000,
      employeeCount: 1100,
      deletedAt: null,
    },
    {
      name: "Docker Containers",
      domain: "docker.com",
      industry: "Virtualization & Containers",
      city: "Palo Alto",
      address: "333 University Ave, Palo Alto, CA",
      linkedInUrl: "https://linkedin.com/company/docker",
      annualRevenue: 140000000,
      employeeCount: 600,
      deletedAt: null,
    },
    {
      name: "OpenAI Innovations",
      domain: "openai.com",
      industry: "Artificial Intelligence",
      city: "San Francisco",
      address: "3180 18th St, San Francisco, CA",
      linkedInUrl: "https://linkedin.com/company/openai",
      annualRevenue: 3400000000,
      employeeCount: 1500,
      deletedAt: null,
    },
  ];

  const companyMap = new Map<string, string>();

  for (const c of companiesData) {
    let company = await prisma.company.findFirst({
      where: {
        workspaceId: workspace.id,
        name: c.name,
      },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          ...c,
          workspaceId: workspace.id,
          deletedAt: null,
        },
      });
    } else {
      company = await prisma.company.update({
        where: { id: company.id },
        data: { ...c, deletedAt: null },
      });
    }
    companyMap.set(c.name, company.id);
  }
  console.log(`✓ Seeded ${companiesData.length} companies for ${workspace.name}`);

  // Seed People & Contacts
  const peopleData = [
    {
      firstName: "Elena",
      lastName: "Rostova",
      email: `elena.rostova@${workspace.id}.stripe.com`,
      phone: "+1 (415) 555-0211",
      jobTitle: "Chief Technology Officer",
      companyName: "Stripe Technologies",
      city: "San Francisco",
      leadStatus: "QUALIFIED",
      leadSource: "Direct Referral",
      industry: "Financial Technology",
      annualRevenue: 14000000000,
      description: "Leading payments core infrastructure and enterprise API scale.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "David",
      lastName: "Chen",
      email: `david.chen@${workspace.id}.vercel.com`,
      phone: "+1 (415) 555-0212",
      jobTitle: "VP of Engineering",
      companyName: "Vercel Cloud Inc",
      city: "San Francisco",
      leadStatus: "CONTACTED",
      leadSource: "Tech Conference",
      industry: "Cloud & Developer Tools",
      annualRevenue: 150000000,
      description: "Oversees edge deployments, next-gen infrastructure, and enterprise reliability.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Sophia",
      lastName: "Patel",
      email: `sophia.patel@${workspace.id}.datadoghq.com`,
      phone: "+1 (212) 555-0213",
      jobTitle: "Director of Infrastructure",
      companyName: "Datadog Observability",
      city: "New York",
      leadStatus: "PROPOSAL",
      leadSource: "Inbound Website",
      industry: "Monitoring & Security",
      annualRevenue: 2100000000,
      description: "Evaluating enterprise CRM data pipelines for telemetry alerts.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Marcus",
      lastName: "Vance",
      email: `marcus.vance@${workspace.id}.snowflake.com`,
      phone: "+1 (406) 555-0214",
      jobTitle: "Chief Information Officer",
      companyName: "Snowflake Data Corp",
      city: "Bozeman",
      leadStatus: "NEGOTIATION",
      leadSource: "Executive Network",
      industry: "Cloud Data Platform",
      annualRevenue: 2800000000,
      description: "Deciding multi-year enterprise integration agreement.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Amara",
      lastName: "Okafor",
      email: `amara.okafor@${workspace.id}.linear.app`,
      phone: "+1 (415) 555-0215",
      jobTitle: "Head of Product",
      companyName: "Linear Systems",
      city: "San Francisco",
      leadStatus: "NEW",
      leadSource: "Product Hunt",
      industry: "Product Management",
      annualRevenue: 30000000,
      description: "Interested in two-way sync between deal progress and product milestones.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Liam",
      lastName: "O'Connor",
      email: `liam.oconnor@${workspace.id}.figma.com`,
      phone: "+1 (415) 555-0216",
      jobTitle: "Principal Design Architect",
      companyName: "Figma Design Labs",
      city: "San Francisco",
      leadStatus: "QUALIFIED",
      leadSource: "Webinar Attendee",
      industry: "Design & Collaboration",
      annualRevenue: 600000000,
      description: "Standardizing CRM interface widgets with internal Figma design tokens.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Maya",
      lastName: "Tanaka",
      email: `maya.tanaka@${workspace.id}.supabase.com`,
      phone: "+65 6555 0217",
      jobTitle: "VP of Operations",
      companyName: "Supabase Platform",
      city: "Singapore",
      leadStatus: "CONTACTED",
      leadSource: "Open Source Community",
      industry: "Backend as a Service",
      annualRevenue: 35000000,
      description: "Exploring automated webhook triggers for developer tier onboarding.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Gabriel",
      lastName: "Santos",
      email: `gabriel.santos@${workspace.id}.retool.com`,
      phone: "+1 (415) 555-0218",
      jobTitle: "Lead Enterprise Architect",
      companyName: "Retool Automation",
      city: "San Francisco",
      leadStatus: "WON",
      leadSource: "Partner Referral",
      industry: "Internal Tools",
      annualRevenue: 100000000,
      description: "Successfully integrated internal admin panel with Orbit CRM endpoints.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Natalie",
      lastName: "Dupont",
      email: `natalie.dupont@${workspace.id}.cloudflare.com`,
      phone: "+1 (415) 555-0219",
      jobTitle: "Head of Security Architecture",
      companyName: "Cloudflare Network",
      city: "San Francisco",
      leadStatus: "NEGOTIATION",
      leadSource: "Direct Referral",
      industry: "Cloud & Cybersecurity",
      annualRevenue: 1300000000,
      description: "Finalizing DDoS protection and zero-trust edge gateway integration.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Vikram",
      lastName: "Singhania",
      email: `vikram.s@${workspace.id}.postman.com`,
      phone: "+1 (415) 555-0220",
      jobTitle: "Director of Developer Ecosystem",
      companyName: "Postman API Labs",
      city: "San Francisco",
      leadStatus: "PROPOSAL",
      leadSource: "Tech Conference",
      industry: "Developer Tools",
      annualRevenue: 180000000,
      description: "Designing public API collection workspace and sandbox test automation.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Karin",
      lastName: "Lindqvist",
      email: `karin.l@${workspace.id}.hashicorp.com`,
      phone: "+1 (415) 555-0221",
      jobTitle: "Staff Cloud Engineer",
      companyName: "HashiCorp Cloud",
      city: "San Francisco",
      leadStatus: "QUALIFIED",
      leadSource: "Inbound Website",
      industry: "DevOps & Infrastructure",
      annualRevenue: 580000000,
      description: "Assessing Terraform module automation for customer tenant provisioning.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Julian",
      lastName: "Mercer",
      email: `julian.mercer@${workspace.id}.mongodb.com`,
      phone: "+1 (212) 555-0222",
      jobTitle: "VP of Enterprise Partnerships",
      companyName: "MongoDB Global",
      city: "New York",
      leadStatus: "WON",
      leadSource: "Executive Network",
      industry: "Database Systems",
      annualRevenue: 1700000000,
      description: "Strategic joint co-selling initiative on MongoDB Atlas Marketplace.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Camila",
      lastName: "Ortega",
      email: `camila.ortega@${workspace.id}.ramp.com`,
      phone: "+1 (212) 555-0223",
      jobTitle: "Head of Finance Operations",
      companyName: "Ramp Financial",
      city: "New York",
      leadStatus: "PROPOSAL",
      leadSource: "LinkedIn Outreach",
      industry: "Fintech & Corporate Cards",
      annualRevenue: 300000000,
      description: "Evaluating real-time invoice matching and automated sync to general ledger.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Ethan",
      lastName: "Holt",
      email: `ethan.holt@${workspace.id}.brex.com`,
      phone: "+1 (801) 555-0224",
      jobTitle: "Director of Enterprise Sales",
      companyName: "Brex Corporate",
      city: "Salt Lake City",
      leadStatus: "CONTACTED",
      leadSource: "Webinar Attendee",
      industry: "Fintech & Spend Management",
      annualRevenue: 280000000,
      description: "Interested in CRM workflow webhooks for corporate expense approvals.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Chloe",
      lastName: "Beauchamp",
      email: `chloe.b@${workspace.id}.docker.com`,
      phone: "+1 (650) 555-0225",
      jobTitle: "VP of Product Strategy",
      companyName: "Docker Containers",
      city: "Palo Alto",
      leadStatus: "QUALIFIED",
      leadSource: "Product Hunt",
      industry: "Virtualization & Containers",
      annualRevenue: 140000000,
      description: "Collaborating on developer container preview environments.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Dr. Arthur",
      lastName: "Pendleton",
      email: `arthur.p@${workspace.id}.openai.com`,
      phone: "+1 (415) 555-0226",
      jobTitle: "Head of Enterprise Solutions",
      companyName: "OpenAI Innovations",
      city: "San Francisco",
      leadStatus: "NEGOTIATION",
      leadSource: "Executive Network",
      industry: "Artificial Intelligence",
      annualRevenue: 3400000000,
      description: "Custom fine-tuning and retrieval-augmented generation deal package.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Siddharth",
      lastName: "Mehta",
      email: `siddharth.m@${workspace.id}.stripe.com`,
      phone: "+1 (415) 555-0227",
      jobTitle: "Lead Solutions Architect",
      companyName: "Stripe Technologies",
      city: "San Francisco",
      leadStatus: "WON",
      leadSource: "Direct Referral",
      industry: "Financial Technology",
      annualRevenue: 14000000000,
      description: "Implemented high-throughput webhook dispatch with zero dropped events.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Rachel",
      lastName: "Greenberg",
      email: `rachel.g@${workspace.id}.vercel.com`,
      phone: "+1 (415) 555-0228",
      jobTitle: "Director of Enterprise Accounts",
      companyName: "Vercel Cloud Inc",
      city: "San Francisco",
      leadStatus: "QUALIFIED",
      leadSource: "Tech Conference",
      industry: "Cloud & Developer Tools",
      annualRevenue: 150000000,
      description: "Managing enterprise rollout across 40 internal feature teams.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Tariq",
      lastName: "Al-Mansoor",
      email: `tariq.m@${workspace.id}.datadoghq.com`,
      phone: "+1 (212) 555-0229",
      jobTitle: "Cloud Security Lead",
      companyName: "Datadog Observability",
      city: "New York",
      leadStatus: "PROPOSAL",
      leadSource: "Inbound Website",
      industry: "Monitoring & Security",
      annualRevenue: 2100000000,
      description: "Reviewing SAML 2.0 and automated SCIM user provisioning specs.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Zoe",
      lastName: "Kaufman",
      email: `zoe.k@${workspace.id}.snowflake.com`,
      phone: "+1 (406) 555-0230",
      jobTitle: "Senior Strategic Sourcing Manager",
      companyName: "Snowflake Data Corp",
      city: "Bozeman",
      leadStatus: "NEGOTIATION",
      leadSource: "Executive Network",
      industry: "Cloud Data Platform",
      annualRevenue: 2800000000,
      description: "Handling legal redlines and commercial terms agreement.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Leo",
      lastName: "Moretti",
      email: `leo.moretti@${workspace.id}.linear.app`,
      phone: "+1 (415) 555-0231",
      jobTitle: "Founding Engineer",
      companyName: "Linear Systems",
      city: "San Francisco",
      leadStatus: "NEW",
      leadSource: "Product Hunt",
      industry: "Product Management",
      annualRevenue: 30000000,
      description: "Testing API response times and webhook latency for customer sync.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Ananya",
      lastName: "Iyer",
      email: `ananya.iyer@${workspace.id}.figma.com`,
      phone: "+1 (415) 555-0232",
      jobTitle: "Design Engineering Manager",
      companyName: "Figma Design Labs",
      city: "San Francisco",
      leadStatus: "QUALIFIED",
      leadSource: "Webinar Attendee",
      industry: "Design & Collaboration",
      annualRevenue: 600000000,
      description: "Spearheading integration between design components and CRM frontend.",
      leadOwnerId: primaryMember.id,
    },
    {
      firstName: "Gilles",
      lastName: "Fournier",
      email: `gilles.f@${workspace.id}.supabase.com`,
      phone: "+65 6555 0233",
      jobTitle: "Head of Developer Experience",
      companyName: "Supabase Platform",
      city: "Singapore",
      leadStatus: "CONTACTED",
      leadSource: "Open Source Community",
      industry: "Backend as a Service",
      annualRevenue: 35000000,
      description: "Drafting developer guides and sample repository templates.",
      leadOwnerId: primaryOwner.id,
    },
    {
      firstName: "Hannah",
      lastName: "Wexler",
      email: `hannah.w@${workspace.id}.retool.com`,
      phone: "+1 (415) 555-0234",
      jobTitle: "Customer Success Director",
      companyName: "Retool Automation",
      city: "San Francisco",
      leadStatus: "WON",
      leadSource: "Partner Referral",
      industry: "Internal Tools",
      annualRevenue: 100000000,
      description: "Overseeing post-sale adoption and workflow expansion metrics.",
      leadOwnerId: primaryMember.id,
    },
  ];

  const personMap = new Map<string, string>();

  for (const p of peopleData) {
    const companyId = companyMap.get(p.companyName);
    let person = await prisma.person.findFirst({
      where: {
        workspaceId: workspace.id,
        email: p.email,
      },
    });

    const personPayload = {
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.phone,
      jobTitle: p.jobTitle,
      city: p.city,
      leadStatus: p.leadStatus,
      leadSource: p.leadSource,
      industry: p.industry,
      annualRevenue: p.annualRevenue,
      description: p.description,
      workspaceId: workspace.id,
      companyId: companyId || null,
      leadOwnerId: p.leadOwnerId,
      createdById: primaryOwner.id,
      modifiedById: primaryMember.id,
      deletedAt: null,
    };

    if (!person) {
      person = await prisma.person.create({
        data: personPayload,
      });
    } else {
      person = await prisma.person.update({
        where: { id: person.id },
        data: personPayload,
      });
    }
    personMap.set(`${p.firstName} ${p.lastName}`, person.id);
  }
  console.log(`✓ Seeded ${peopleData.length} contacts for ${workspace.name}`);

  // Seed Opportunities / Deals
  // Note: Carefully distribute closeDate around CURRENT DAY (now) so that Week, Month, Quarter, Year all have deals!
  const now = new Date();
  const opportunitiesData = [
    // WON DEALS
    {
      name: "Global Payment Processing Expansion",
      amount: 250000,
      stageName: "Won",
      probability: 100,
      companyName: "Stripe Technologies",
      contactName: "Elena Rostova",
      source: "Direct Referral",
      closeDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      name: "Strategic Joint Cloud Marketplace Co-Sell",
      amount: 450000,
      stageName: "Won",
      probability: 100,
      companyName: "MongoDB Global",
      contactName: "Julian Mercer",
      source: "Executive Network",
      closeDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
    {
      name: "Internal Developer Portal Automation Suite",
      amount: 65000,
      stageName: "Won",
      probability: 100,
      companyName: "Retool Automation",
      contactName: "Gabriel Santos",
      source: "Partner Referral",
      closeDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    },
    {
      name: "High-Throughput Webhook Engine License",
      amount: 110000,
      stageName: "Won",
      probability: 100,
      companyName: "Stripe Technologies",
      contactName: "Siddharth Mehta",
      source: "Direct Referral",
      closeDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
    },

    // NEGOTIATION DEALS (Closing this week & this month!)
    {
      name: "Enterprise Multi-Region Edge Deployments",
      amount: 140000,
      stageName: "Negotiation",
      probability: 75,
      companyName: "Vercel Cloud Inc",
      contactName: "David Chen",
      source: "Tech Conference",
      closeDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
    },
    {
      name: "Cloud Data Warehouse Analytics License",
      amount: 320000,
      stageName: "Negotiation",
      probability: 80,
      companyName: "Snowflake Data Corp",
      contactName: "Marcus Vance",
      source: "Executive Network",
      closeDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // in 2 days
    },
    {
      name: "Zero-Trust Enterprise Edge Security Gateway",
      amount: 210000,
      stageName: "Negotiation",
      probability: 85,
      companyName: "Cloudflare Network",
      contactName: "Natalie Dupont",
      source: "Direct Referral",
      closeDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // in 3 days
    },
    {
      name: "Dedicated AI Fine-Tuning Infrastructure Cluster",
      amount: 380000,
      stageName: "Negotiation",
      probability: 75,
      companyName: "OpenAI Innovations",
      contactName: "Dr. Arthur Pendleton",
      source: "Executive Network",
      closeDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // in 5 days
    },

    // PROPOSAL DEALS
    {
      name: "Observability Telemetry Cluster Upgrade",
      amount: 85000,
      stageName: "Proposal",
      probability: 50,
      companyName: "Datadog Observability",
      contactName: "Sophia Patel",
      source: "Inbound Website",
      closeDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // in 1 day
    },
    {
      name: "Postgres Fleet Orchestration Contract",
      amount: 95000,
      stageName: "Proposal",
      probability: 50,
      companyName: "Supabase Platform",
      contactName: "Maya Tanaka",
      source: "Open Source Community",
      closeDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // in 2 days
    },
    {
      name: "Public API Workspace & Mock Engine Rollout",
      amount: 72000,
      stageName: "Proposal",
      probability: 55,
      companyName: "Postman API Labs",
      contactName: "Vikram Singhania",
      source: "Tech Conference",
      closeDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // in 4 days
    },
    {
      name: "Automated Spend Reconciliation Connector",
      amount: 58000,
      stageName: "Proposal",
      probability: 60,
      companyName: "Ramp Financial",
      contactName: "Camila Ortega",
      source: "LinkedIn Outreach",
      closeDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // in 6 days
    },

    // QUALIFIED DEALS
    {
      name: "Software Issue Tracker Enterprise Rollout",
      amount: 45000,
      stageName: "Qualified",
      probability: 25,
      companyName: "Linear Systems",
      contactName: "Amara Okafor",
      source: "Product Hunt",
      closeDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // in 2 days
    },
    {
      name: "Infrastructure Automation & Vault Sync Package",
      amount: 115000,
      stageName: "Qualified",
      probability: 30,
      companyName: "HashiCorp Cloud",
      contactName: "Karin Lindqvist",
      source: "Inbound Website",
      closeDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // in 3 days
    },
    {
      name: "Containerized Preview Environment Fleet",
      amount: 88000,
      stageName: "Qualified",
      probability: 35,
      companyName: "Docker Containers",
      contactName: "Chloe Beauchamp",
      source: "Product Hunt",
      closeDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // in 5 days
    },
    {
      name: "Multi-Team Global Workspace Upgrade",
      amount: 98000,
      stageName: "Qualified",
      probability: 40,
      companyName: "Vercel Cloud Inc",
      contactName: "Rachel Greenberg",
      source: "Tech Conference",
      closeDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // in 6 days
    },

    // LEAD STAGE
    {
      name: "Design System Token Integration Platform",
      amount: 60000,
      stageName: "Lead",
      probability: 10,
      companyName: "Figma Design Labs",
      contactName: "Liam O'Connor",
      source: "Webinar",
      closeDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // in 1 day
    },
    {
      name: "Corporate Card Spend Policy Engine",
      amount: 42000,
      stageName: "Lead",
      probability: 15,
      companyName: "Brex Corporate",
      contactName: "Ethan Holt",
      source: "Webinar Attendee",
      closeDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // in 3 days
    },

    // LOST DEALS
    {
      name: "Legacy Monolith Migration Consulting",
      amount: 30000,
      stageName: "Lost",
      probability: 0,
      companyName: "Stripe Technologies",
      contactName: "Elena Rostova",
      source: "Cold Inbound",
      closeDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      name: "Custom On-Premises Telemetry Server",
      amount: 50000,
      stageName: "Lost",
      probability: 0,
      companyName: "Datadog Observability",
      contactName: "Tariq Al-Mansoor",
      source: "Inbound Website",
      closeDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    },
  ];

  const opportunityMap = new Map<string, string>();

  for (const o of opportunitiesData) {
    const stageId = stageMap.get(o.stageName)!;
    const companyId = companyMap.get(o.companyName);
    const personId = personMap.get(o.contactName);

    let opp = await prisma.opportunity.findFirst({
      where: {
        workspaceId: workspace.id,
        name: o.name,
      },
    });

    const oppPayload = {
      name: o.name,
      amount: o.amount,
      stageId,
      probability: o.probability,
      closeDate: o.closeDate,
      source: o.source,
      workspaceId: workspace.id,
      companyId: companyId || null,
      deletedAt: null,
    };

    if (!opp) {
      opp = await prisma.opportunity.create({
        data: oppPayload,
      });
    } else {
      opp = await prisma.opportunity.update({
        where: { id: opp.id },
        data: oppPayload,
      });
    }
    opportunityMap.set(o.name, opp.id);

    // Link contact to opportunity if person exists
    if (personId) {
      const existingContact = await prisma.opportunityContact.findUnique({
        where: {
          opportunityId_personId: {
            opportunityId: opp.id,
            personId,
          },
        },
      });

      if (!existingContact) {
        await prisma.opportunityContact.create({
          data: {
            opportunityId: opp.id,
            personId,
            role: "Decision Maker",
            workspaceId: workspace.id,
          },
        });
      }
    }
  }
  console.log(`✓ Seeded ${opportunitiesData.length} opportunities for ${workspace.name}`);

  // Seed Actionable CRM Tasks
  const tasksData = [
    {
      title: "Send finalized Enterprise SLA agreement for signature",
      description: "Deliver revised 99.99% uptime guarantee and dedicated TAM clause to Elena.",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      assigneeId: primaryOwner.id,
      companyName: "Stripe Technologies",
      oppName: "Global Payment Processing Expansion",
    },
    {
      title: "Conduct technical architecture alignment call with VP Eng",
      description: "Review edge routing architecture, latency SLAs, and canary deployment stages.",
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      assigneeId: primaryMember.id,
      companyName: "Vercel Cloud Inc",
      oppName: "Enterprise Multi-Region Edge Deployments",
    },
    {
      title: "Prepare custom ROI and performance benchmark report",
      description: "Calculate expected query cost savings comparing previous architecture vs Snowflake.",
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      assigneeId: primaryOwner.id,
      companyName: "Snowflake Data Corp",
      oppName: "Cloud Data Warehouse Analytics License",
    },
    {
      title: "Complete vendor SOC2 Type II compliance audit packet",
      description: "Filled out 85 questionnaire controls and attached certificate of insurance.",
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      assigneeId: primaryMember.id,
      companyName: "Datadog Observability",
      oppName: "Observability Telemetry Cluster Upgrade",
    },
    {
      title: "Verify webhook secret verification and retry policy",
      description: "Ensure test events trigger resilient retry with exponential backoff on Supabase.",
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      dueDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      assigneeId: primaryMember.id,
      companyName: "Supabase Platform",
      oppName: "Postgres Fleet Orchestration Contract",
    },
    {
      title: "Deliver Q4 roadmap sync and executive briefing",
      description: "Present new AI integration features and automated deal stage workflow engine.",
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      assigneeId: primaryOwner.id,
      companyName: "Linear Systems",
      oppName: "Software Issue Tracker Enterprise Rollout",
    },
    {
      title: "Schedule Cloudflare Zero-Trust Security Review",
      description: "Coordinate with Natalie Dupont on mTLS client certificate authentication.",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      assigneeId: primaryOwner.id,
      companyName: "Cloudflare Network",
      oppName: "Zero-Trust Enterprise Edge Security Gateway",
    },
    {
      title: "Deliver Postman API Collection & Environment Templates",
      description: "Upload verified API requests and automated test assertions for developer team.",
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      assigneeId: primaryMember.id,
      companyName: "Postman API Labs",
      oppName: "Public API Workspace & Mock Engine Rollout",
    },
    {
      title: "Draft HashiCorp Terraform Provider Specifications",
      description: "Specify resource schema, data sources, and provider state management lifecycle.",
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      assigneeId: primaryMember.id,
      companyName: "HashiCorp Cloud",
      oppName: "Infrastructure Automation & Vault Sync Package",
    },
    {
      title: "Finalize MongoDB Atlas Co-Selling Go-To-Market Plan",
      description: "Agree on joint sales collateral, customer webinar dates, and partner deal registration.",
      status: TaskStatus.DONE,
      priority: Priority.URGENT,
      dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      assigneeId: primaryOwner.id,
      companyName: "MongoDB Global",
      oppName: "Strategic Joint Cloud Marketplace Co-Sell",
    },
    {
      title: "Audit Ramp General Ledger Sync Permissions",
      description: "Verify OAuth scopes for chart of accounts mapping and expense categorization.",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      assigneeId: primaryMember.id,
      companyName: "Ramp Financial",
      oppName: "Automated Spend Reconciliation Connector",
    },
    {
      title: "Conduct OpenAI Dedicated Cluster Architecture Workshop",
      description: "Review GPU throughput, p99 token generation latency, and VPC peering boundaries.",
      status: TaskStatus.TODO,
      priority: Priority.URGENT,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      assigneeId: primaryOwner.id,
      companyName: "OpenAI Innovations",
      oppName: "Dedicated AI Fine-Tuning Infrastructure Cluster",
    },
    {
      title: "Review Figma Design System Component Manifest",
      description: "Ensure button variants, input states, and dialogs match latest tokens in v2.4.",
      status: TaskStatus.DONE,
      priority: Priority.LOW,
      dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      assigneeId: primaryMember.id,
      companyName: "Figma Design Labs",
      oppName: "Design System Token Integration Platform",
    },
    {
      title: "Verify Docker Multi-Arch Build Pipeline Performance",
      description: "Benchmark arm64 vs amd64 container image build times on dedicated runners.",
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      assigneeId: primaryMember.id,
      companyName: "Docker Containers",
      oppName: "Containerized Preview Environment Fleet",
    },
    {
      title: "Review Brex Expense API Webhook Rate Limits",
      description: "Confirm burst capacity of 1,000 req/sec during month-end payroll reconciliation.",
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      assigneeId: primaryOwner.id,
      companyName: "Brex Corporate",
      oppName: "Corporate Card Spend Policy Engine",
    },
    {
      title: "Retool Post-Deployment Customer Health Check",
      description: "Review daily active user count, API error rates, and load performance on Retool app.",
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      dueDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      assigneeId: primaryMember.id,
      companyName: "Retool Automation",
      oppName: "Internal Developer Portal Automation Suite",
    },
  ];

  for (const t of tasksData) {
    const companyId = companyMap.get(t.companyName);
    const opportunityId = opportunityMap.get(t.oppName);

    const existingTask = await prisma.task.findFirst({
      where: {
        workspaceId: workspace.id,
        title: t.title,
      },
    });

    const taskPayload = {
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      completedAt: t.completedAt || null,
      workspaceId: workspace.id,
      assigneeId: t.assigneeId,
      companyId: companyId || null,
      opportunityId: opportunityId || null,
      deletedAt: null,
    };

    if (!existingTask) {
      await prisma.task.create({
        data: taskPayload,
      });
    } else {
      await prisma.task.update({
        where: { id: existingTask.id },
        data: taskPayload,
      });
    }
  }
  console.log(`✓ Seeded ${tasksData.length} tasks for ${workspace.name}`);

  // Seed Notes
  const notesData = [
    {
      title: "Enterprise Architecture Discovery Notes",
      content: "Discussed multi-region scalability requirements with CTO Elena Rostova. Stripe processes over 10M events daily with a p99 latency budget of 200ms. Validated that Orbit CRM automated webhooks and real-time event streaming fulfill their tier-1 mission-critical needs without requiring architectural rewrites.",
      companyName: "Stripe Technologies",
      contactName: "Elena Rostova",
      oppName: "Global Payment Processing Expansion",
    },
    {
      title: "Commercial Negotiation & Terms Discussion",
      content: "Reviewed pricing framework for 3-year enterprise commitment with CIO Marcus Vance. Client requested 12% enterprise discount in exchange for upfront annual billing and participating in a public customer case study. Legal approved master terms.",
      companyName: "Snowflake Data Corp",
      contactName: "Marcus Vance",
      oppName: "Cloud Data Warehouse Analytics License",
    },
    {
      title: "Security & SOC2 Compliance Sign-off",
      content: "Information Security department approved our security whitepaper, GDPR data processing addendum, and ISO 27001 audit report without exceptions. Zero blockers remaining for enterprise rollout.",
      companyName: "Datadog Observability",
      contactName: "Sophia Patel",
      oppName: "Observability Telemetry Cluster Upgrade",
    },
    {
      title: "Zero-Trust Edge Routing Technical Review",
      content: "Met with Head of Security Architecture Natalie Dupont. Confirmed that all ingress traffic will pass through Cloudflare Magic Transit and Workers edge nodes. Encryption in transit enforced with TLS 1.3 and HSTS preloading.",
      companyName: "Cloudflare Network",
      contactName: "Natalie Dupont",
      oppName: "Zero-Trust Enterprise Edge Security Gateway",
    },
    {
      title: "OpenAI Dedicated Cluster Deployment Strategy",
      content: "Deep technical session with Dr. Arthur Pendleton regarding private VPC endpoints for fine-tuned LLMs. Orbit CRM AI Copilot queries will leverage dedicated token throughput with strict zero-data-retention guarantees.",
      companyName: "OpenAI Innovations",
      contactName: "Dr. Arthur Pendleton",
      oppName: "Dedicated AI Fine-Tuning Infrastructure Cluster",
    },
    {
      title: "Postman Collections & CI/CD Pipeline Automation",
      content: "Finalized automated regression test suite using Postman CLI (Newman) integrated into GitHub Actions. API contract tests will run on every staging pull request before production deployment.",
      companyName: "Postman API Labs",
      contactName: "Vikram Singhania",
      oppName: "Public API Workspace & Mock Engine Rollout",
    },
    {
      title: "MongoDB Atlas Co-Selling Agreement Execution",
      content: "Executed joint partner agreement with VP Julian Mercer. Listing Orbit CRM on MongoDB Atlas Marketplace unlocks direct enterprise procurement via AWS, Azure, and Google Cloud commitments.",
      companyName: "MongoDB Global",
      contactName: "Julian Mercer",
      oppName: "Strategic Joint Cloud Marketplace Co-Sell",
    },
    {
      title: "Ramp Financial Integration & Token Lifecycle",
      content: "Reviewed OAuth 2.0 PKCE flow and webhook signature validation with Camila Ortega. Verified automated secret rotation policy every 90 days with zero downtime token refresh.",
      companyName: "Ramp Financial",
      contactName: "Camila Ortega",
      oppName: "Automated Spend Reconciliation Connector",
    },
  ];

  for (const n of notesData) {
    const companyId = companyMap.get(n.companyName);
    const personId = personMap.get(n.contactName);
    const oppId = opportunityMap.get(n.oppName);

    const existingNote = await prisma.note.findFirst({
      where: {
        workspaceId: workspace.id,
        title: n.title,
      },
    });

    const notePayload = {
      title: n.title,
      body: makeTiptapJson(n.content),
      workspaceId: workspace.id,
      authorId: primaryOwner.id,
      companyId: companyId || null,
      personId: personId || null,
      opportunityId: oppId || null,
      deletedAt: null,
    };

    if (!existingNote) {
      await prisma.note.create({
        data: notePayload,
      });
    } else {
      await prisma.note.update({
        where: { id: existingNote.id },
        data: notePayload,
      });
    }
  }

  // Seed Activity Timeline
  const activitiesData = [
    {
      type: ActivityType.MEETING,
      title: "Executive Architecture Discovery Call",
      body: "Completed 45-minute discovery session with CTO Elena Rostova and lead infrastructure engineers.",
      companyName: "Stripe Technologies",
      oppName: "Global Payment Processing Expansion",
      occurredAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      type: ActivityType.CALL,
      title: "Quarterly Enterprise Renewal Check-in",
      body: "Briefed VP of Engineering David Chen on roadmap improvements and latency optimizations.",
      companyName: "Vercel Cloud Inc",
      oppName: "Enterprise Multi-Region Edge Deployments",
      occurredAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      type: ActivityType.EMAIL,
      title: "Sent Master Services Agreement & SLA Draft",
      body: "Sent revised enterprise contract terms including 99.99% availability guarantee to Marcus Vance.",
      companyName: "Snowflake Data Corp",
      oppName: "Cloud Data Warehouse Analytics License",
      occurredAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: ActivityType.DEAL_STAGE_CHANGED,
      title: "Deal Advanced to Negotiation",
      body: "Opportunity moved from Proposal to Negotiation stage following executive committee approval.",
      companyName: "Cloudflare Network",
      oppName: "Zero-Trust Enterprise Edge Security Gateway",
      occurredAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: ActivityType.TASK_COMPLETED,
      title: "Completed SOC2 Security Questionnaire",
      body: "Completed and submitted comprehensive vendor risk management questionnaire to Datadog.",
      companyName: "Datadog Observability",
      oppName: "Observability Telemetry Cluster Upgrade",
      occurredAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      type: ActivityType.DEAL_STAGE_CHANGED,
      title: "Deal Marked Closed Won",
      body: "Executed joint partner agreement with Julian Mercer. Value: $450,000.",
      companyName: "MongoDB Global",
      oppName: "Strategic Joint Cloud Marketplace Co-Sell",
      occurredAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const a of activitiesData) {
    const companyId = companyMap.get(a.companyName);
    const oppId = opportunityMap.get(a.oppName);

    const existingAct = await prisma.activity.findFirst({
      where: {
        workspaceId: workspace.id,
        title: a.title,
      },
    });

    const actPayload = {
      type: a.type,
      title: a.title,
      body: a.body,
      workspaceId: workspace.id,
      authorId: primaryOwner.id,
      companyId: companyId || null,
      opportunityId: oppId || null,
      occurredAt: a.occurredAt,
    };

    if (!existingAct) {
      await prisma.activity.create({
        data: actPayload,
      });
    } else {
      await prisma.activity.update({
        where: { id: existingAct.id },
        data: actPayload,
      });
    }
  }

  // Seed AI Chat Sessions
  const aiChatSessions = [
    {
      title: "Q4 Sales Pipeline Review & Forecasting",
      userId: primaryOwner.id,
      messages: [
        {
          role: "user",
          content: "Can you summarize our highest probability deals in Negotiation stage closing this month?",
        },
        {
          role: "assistant",
          content: "Certainly! You have three key opportunities currently in Negotiation stage with over 75% win probability:\n\n1. **Enterprise Multi-Region Edge Deployments** (Vercel Cloud Inc) - $140,000, 75% probability, closing in 1 day.\n2. **Zero-Trust Enterprise Edge Security Gateway** (Cloudflare Network) - $210,000, 85% probability, closing in 3 days.\n3. **Dedicated AI Fine-Tuning Infrastructure Cluster** (OpenAI Innovations) - $380,000, 75% probability, closing in 5 days.\n\nTotal weighted pipeline in negotiation is **$585,000**. Key blocker to monitor is SOC2 sign-off with Cloudflare security.",
        },
      ],
    },
    {
      title: "Lead Prioritization & Outreach Strategy",
      userId: primaryMember.id,
      messages: [
        {
          role: "user",
          content: "Which newly contacted leads should I prioritize reaching out to this week?",
        },
        {
          role: "assistant",
          content: "Based on company employee count, annual revenue, and lead source score, here are your top 2 priorities:\n\n1. **David Chen** (VP of Engineering at Vercel Cloud Inc) - High-intent conference lead. Deal value $140,000.\n2. **Karin Lindqvist** (Staff Cloud Engineer at HashiCorp Cloud) - Inbound website lead evaluating Terraform provider integration ($115,000).\n\nRecommendation: Send personalized technical summaries highlighting our sub-50ms API response time benchmarks.",
        },
      ],
    },
  ];

  for (const sessionData of aiChatSessions) {
    let session = await prisma.chatSession.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: sessionData.userId,
        title: sessionData.title,
      },
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          title: sessionData.title,
          workspaceId: workspace.id,
          userId: sessionData.userId,
        },
      });

      for (const msg of sessionData.messages) {
        await prisma.chatMessage.create({
          data: {
            role: msg.role,
            content: msg.content,
            sessionId: session.id,
          },
        });
      }
    }
  }

  // Seed File Attachments
  const attachmentsData = [
    {
      name: "Stripe_Enterprise_Master_Services_Agreement_v3.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1845200,
      url: "https://example.com/docs/Stripe_MSA_v3.pdf",
      storageKey: "acme/attachments/stripe_msa.pdf",
      companyName: "Stripe Technologies",
      oppName: "Global Payment Processing Expansion",
    },
    {
      name: "Vercel_Edge_Architecture_Diagram_AWS_MultiRegion.png",
      mimeType: "image/png",
      sizeBytes: 3412000,
      url: "https://example.com/docs/Vercel_Edge_Arch.png",
      storageKey: "acme/attachments/vercel_edge.png",
      companyName: "Vercel Cloud Inc",
      oppName: "Enterprise Multi-Region Edge Deployments",
    },
    {
      name: "Snowflake_SOC2_Type2_Audit_Report_2026.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4210000,
      url: "https://example.com/docs/Snowflake_SOC2.pdf",
      storageKey: "acme/attachments/snowflake_soc2.pdf",
      companyName: "Snowflake Data Corp",
      oppName: "Cloud Data Warehouse Analytics License",
    },
    {
      name: "Cloudflare_ZeroTrust_Technical_Proposal.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2540000,
      url: "https://example.com/docs/Cloudflare_Proposal.pdf",
      storageKey: "acme/attachments/cloudflare_proposal.pdf",
      companyName: "Cloudflare Network",
      oppName: "Zero-Trust Enterprise Edge Security Gateway",
    },
  ];

  for (const att of attachmentsData) {
    const companyId = companyMap.get(att.companyName);
    const oppId = opportunityMap.get(att.oppName);

    const existingAtt = await prisma.attachment.findFirst({
      where: {
        workspaceId: workspace.id,
        name: att.name,
      },
    });

    if (!existingAtt) {
      await prisma.attachment.create({
        data: {
          name: att.name,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
          url: att.url,
          storageKey: att.storageKey,
          isPublic: false,
          workspaceId: workspace.id,
          uploadedById: primaryOwner.id,
          companyId: companyId || null,
          opportunityId: oppId || null,
        },
      });
    }
  }
}

async function seed() {
  console.log("==================================================");
  console.log(" Orbit CRM: Seeding Ample & Realistic Showcase Demo Data");
  console.log("==================================================");

  const hashedPassword = await hashPassword(DEMO_PASSWORD);

  // 1. Define Demo Users (Strictly 1 Owner and 1 Member)
  const demoUsersConfig = [
    {
      email: "demo@orbitcrm.com",
      name: "Alex Morgan",
      role: MemberRole.OWNER,
      displayRole: "Workspace Owner",
    },
    {
      email: "member@orbitcrm.com",
      name: "Sarah Connor",
      role: MemberRole.MEMBER,
      displayRole: "Workspace Member",
    },
  ];

  // 2. Ensure Primary Demo Workspace: Acme Innovations
  let primaryWorkspace = await prisma.workspace.findFirst({
    where: { name: "Acme Innovations" },
  });

  if (!primaryWorkspace) {
    primaryWorkspace = await prisma.workspace.create({
      data: {
        name: "Acme Innovations",
        domain: "acme.com",
      },
    });
  }

  // Get all workspaces in the system so we can ensure demo users are members and all workspaces have data
  const allWorkspaces = await prisma.workspace.findMany();

  // 3. Create Users, Better Auth Accounts & Memberships
  const seededUsers: Record<string, any> = {};

  for (const u of demoUsersConfig) {
    let user = await prisma.user.findUnique({
      where: { email: u.email },
    });

    if (!user) {
      const userId = crypto.randomBytes(16).toString("hex");
      user = await prisma.user.create({
        data: {
          id: userId,
          email: u.email,
          name: u.name,
          emailVerified: true,
          tokenVersion: 1,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: u.name,
          emailVerified: true,
        },
      });
    }

    seededUsers[u.email] = user;

    // Better Auth Account
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    });

    if (!existingAccount) {
      const accountId = crypto.randomBytes(16).toString("hex");
      await prisma.account.create({
        data: {
          id: accountId,
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: hashedPassword,
        },
      });
    } else {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword },
      });
    }

    // Add membership for ALL workspaces in system so whichever is active in localStorage works!
    for (const ws of allWorkspaces) {
      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: ws.id,
          },
        },
      });

      if (!member) {
        await prisma.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: ws.id,
            role: u.role,
          },
        });
      } else {
        await prisma.workspaceMember.update({
          where: { id: member.id },
          data: { role: u.role },
        });
      }
    }
  }

  const primaryOwner = seededUsers["demo@orbitcrm.com"];
  const primaryMember = seededUsers["member@orbitcrm.com"];

  // 4. Seed each workspace
  for (const ws of allWorkspaces) {
    await seedWorkspace(ws, primaryOwner, primaryMember);
  }

  // Ensure each workspace only has the 1 demo owner and 1 demo member
  const allowedEmails = ["demo@orbitcrm.com", "member@orbitcrm.com"];
  await prisma.workspaceMember.deleteMany({
    where: {
      user: {
        email: { notIn: allowedEmails },
      },
    },
  });

  // 5. Ensure all existing documents in database have deletedAt: null explicitly set!
  await prisma.person.updateMany({ where: { deletedAt: { isSet: false } }, data: { deletedAt: null } });
  await prisma.company.updateMany({ where: { deletedAt: { isSet: false } }, data: { deletedAt: null } });
  await prisma.opportunity.updateMany({ where: { deletedAt: { isSet: false } }, data: { deletedAt: null } });
  await prisma.task.updateMany({ where: { deletedAt: { isSet: false } }, data: { deletedAt: null } });
  await prisma.note.updateMany({ where: { deletedAt: { isSet: false } }, data: { deletedAt: null } });

  console.log("==================================================");
  console.log("✓ Ample Showcase Seeding Completed Successfully!");
  console.log("--------------------------------------------------");
  console.log("Demo Credentials:");
  console.log("  Workspace Owner: demo@orbitcrm.com / DemoPassword123!");
  console.log("  Workspace Member: member@orbitcrm.com / DemoPassword123!");
  console.log("==================================================");
}

seed()
  .catch((e) => {
    console.error("Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
