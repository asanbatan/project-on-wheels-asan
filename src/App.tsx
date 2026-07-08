import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type BrowserWindowWithAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type TradeRound = {
  company: (typeof kidKnownCompanies)[number];
  startPrice: number;
  endPrice: number;
  shares: number;
  movePercent: number;
  news: string;
  points: Array<{ x: number; y: number; price: number }>;
  line: string;
  area: string;
};

type LessonMistake = {
  questionIndex: number;
  question: string;
  picked: string;
  correct: string;
};

type ChartMode = 'line' | 'candles';
type LessonDifficulty = 'Easy' | 'Medium' | 'Hard';

type SavedProgress = {
  activeLessonId: string;
  chartMode: ChartMode;
  claimedAchievements: string[];
  completedLessons: string[];
  currency: CurrencyId;
  cursorColor: CursorColorId;
  cursorDesign: CursorDesignId;
  language: LanguageId;
  lessonDifficulty: LessonDifficulty;
  lessonDifficultyChosen: boolean;
  ownedBoosters: Partial<Record<MarketBoosterId, number>>;
  ownedHints: number;
  ownedRampages: number;
  ownedSkips: number;
  realPiggyBank: number;
  skippedQuestions: string[];
  theme: ThemeId;
  wallet: number;
  xp: number;
};

type VaultGameId = 'tiles' | 'code' | 'market' | 'snake' | 'breaker';

type SnakeCell = {
  x: number;
  y: number;
};

type BreakerBall = {
  x: number;
  y: number;
  dx: number;
  dy: number;
};

const hintCost = 10;
const skipCost = 25;
const skipRampageCost = 500;
const snakeBoardSize = 10;
const breakerBrickCount = 18;

function makeSnakeFood(snake: SnakeCell[]) {
  const openCells = Array.from({ length: snakeBoardSize * snakeBoardSize }, (_, index) => ({
    x: index % snakeBoardSize,
    y: Math.floor(index / snakeBoardSize),
  })).filter((cell) => !snake.some((snakeCell) => snakeCell.x === cell.x && snakeCell.y === cell.y));

  return openCells[Math.floor(Math.random() * openCells.length)] ?? { x: 8, y: 8 };
}

function getFreshBricks() {
  return Array.from({ length: breakerBrickCount }, (_, index) => index);
}

const marketBoosters = [
  {
    id: 'insight',
    label: 'Insight',
    cost: 25,
    effect: 'Reveals whether the final move is up or down.',
  },
  {
    id: 'extra-shares',
    label: 'Extra Shares',
    cost: 50,
    effect: 'Adds 5 shares to this round.',
  },
  {
    id: 'double',
    label: 'Double',
    cost: 75,
    effect: 'Doubles the gain or loss.',
  },
  {
    id: 'shield',
    label: 'Shield',
    cost: 100,
    effect: 'Blocks one losing trade from taking cash.',
  },
] as const;

type MarketBoosterId = (typeof marketBoosters)[number]['id'];

function getEmptyBoosters(): Record<MarketBoosterId, number> {
  return marketBoosters.reduce(
    (boosters, booster) => ({
      ...boosters,
      [booster.id]: 0,
    }),
    {} as Record<MarketBoosterId, number>,
  );
}

const lessons = [
  {
    id: 'basics',
    badge: '1',
    skill: 'Basics',
    title: '1. What investing means',
    text: 'Investing means putting money into something that might grow over time. A stock is a tiny piece of a company. If the company does well, the stock can become worth more, but it can also lose value.',
    check: 'Beginner rule: never invest money you need soon.',
    questions: [
      {
        question: 'What is a stock?',
        choices: [
          'A tiny ownership piece of a company',
          'A promise that money will double',
          'A bank account with no risk',
        ],
        correct: 'A tiny ownership piece of a company',
      },
      {
        question: 'Why can a stock price change?',
        choices: [
          'The price must go up every week',
          'People change what they think the company is worth',
          'The company chooses any number it wants each morning',
        ],
        correct: 'People change what they think the company is worth',
      },
      {
        question: 'Which money is usually safer to keep out of investing?',
        choices: [
          'Pretend practice money',
          'Money someone plans to leave alone for years',
          'Money needed soon for something important',
        ],
        correct: 'Money needed soon for something important',
      },
    ],
  },
  {
    id: 'drops',
    badge: '2',
    skill: 'Price Drops',
    title: '2. Price going down does not always mean sell',
    text: 'A falling price is a warning sign, not an automatic sell button. Ask: Did something bad happen to the company? Is the whole market down? Did I only buy because of hype?',
    check: 'Smart move: understand why it changed before pretending to buy or sell.',
    questions: [
      {
        question: 'A stock drops 8% in one day. What is the smartest first step?',
        choices: [
          'Sell because red always means danger',
          'Check the reason for the drop',
          'Buy more because cheaper is always better',
        ],
        correct: 'Check the reason for the drop',
      },
      {
        question: 'Which price drop sounds more serious?',
        choices: [
          'The whole market had one nervous day',
          'The price moved down a little after moving up a lot',
          'The company lost lots of customers for months',
        ],
        correct: 'The company lost lots of customers for months',
      },
      {
        question: 'What is panic selling?',
        choices: [
          'Selling after calmly checking facts',
          'Selling only because you feel scared',
          'Selling a pretend investment in a lesson',
        ],
        correct: 'Selling only because you feel scared',
      },
    ],
  },
  {
    id: 'spread',
    badge: '3',
    skill: 'Spread Risk',
    title: '3. Diversification',
    text: 'Diversification means not putting all your money in one place. If one company has a bad year, other investments may help balance it out.',
    check: 'Kid version: do not put every snack in one backpack pocket.',
    questions: [
      {
        question: 'Which pretend portfolio is more diversified?',
        choices: [
          'Several different companies and funds',
          'Only one shoe company',
          'Three shares of the same company',
        ],
        correct: 'Several different companies and funds',
      },
      {
        question: 'Why can diversification help?',
        choices: [
          'It removes all risk forever',
          'One bad investment may hurt less',
          'It guarantees the biggest return',
        ],
        correct: 'One bad investment may hurt less',
      },
      {
        question: 'Which choice is still risky?',
        choices: [
          'Owning different types of investments',
          'Keeping emergency money in savings',
          'Owning many companies from only one tiny industry',
        ],
        correct: 'Owning many companies from only one tiny industry',
      },
    ],
  },
  {
    id: 'growth',
    badge: '4',
    skill: 'Growth',
    title: '4. Compound growth',
    text: 'Compound growth happens when your money earns more money, then that new money can earn money too. Time is the secret ingredient.',
    check: 'Small amounts can grow a lot if they have enough years.',
    questions: [
      {
        question: 'Why does starting earlier help compound growth?',
        choices: [
          'Earlier money never loses value',
          'The money has more time to grow on earlier growth',
          'Starting early means you can ignore risk',
        ],
        correct: 'The money has more time to grow on earlier growth',
      },
      {
        question: 'What makes compound growth different from simple saving?',
        choices: [
          'It always grows the same amount every day',
          'It only works with huge amounts of money',
          'Growth can earn more growth later',
        ],
        correct: 'Growth can earn more growth later',
      },
      {
        question: 'Why is the calculator only a demo?',
        choices: [
          'Real investments go up and down, not smoothly',
          '6% means every investor gets exactly 6%',
          'Calculators cannot use years',
        ],
        correct: 'Real investments go up and down, not smoothly',
      },
    ],
  },
  {
    id: 'funds',
    badge: '5',
    skill: 'Funds',
    title: '5. Funds and ETFs',
    text: 'A fund is a basket of investments. An ETF is a fund that can trade like a stock. Instead of picking one company, a fund can hold many companies at once.',
    check: 'Useful idea: a basket can be less risky than one single company.',
    questions: [
      {
        question: 'What is an ETF?',
        choices: [
          'A basket of investments that can trade like a stock',
          'A secret code that predicts tomorrow prices',
          'A company that cannot lose money',
        ],
        correct: 'A basket of investments that can trade like a stock',
      },
      {
        question: 'Why might a beginner prefer a broad fund?',
        choices: [
          'It spreads money across many investments',
          'It always beats every individual stock',
          'It removes the need to learn anything',
        ],
        correct: 'It spreads money across many investments',
      },
      {
        question: 'Which fund sounds more diversified?',
        choices: [
          'A fund holding hundreds of companies from many industries',
          'A fund holding only one video game company',
          'A fund holding three very similar phone companies',
        ],
        correct: 'A fund holding hundreds of companies from many industries',
      },
    ],
  },
  {
    id: 'dividends',
    badge: '6',
    skill: 'Dividends',
    title: '6. Dividends and income',
    text: 'Some companies pay shareholders a small part of their profits called a dividend. Dividends can be useful, but they are not guaranteed.',
    check: 'Income from investing can change, stop, or grow depending on the company.',
    questions: [
      {
        question: 'What is a dividend?',
        choices: [
          'Money some companies pay to shareholders',
          'A fee you pay every time a stock goes up',
          'A rule that makes every investment safe',
        ],
        correct: 'Money some companies pay to shareholders',
      },
      {
        question: 'Which statement is most realistic?',
        choices: [
          'A company can lower or stop a dividend',
          'Dividends are always paid forever',
          'Only losing companies pay dividends',
        ],
        correct: 'A company can lower or stop a dividend',
      },
      {
        question: 'Why do some investors reinvest dividends?',
        choices: [
          'To buy more shares over time',
          'To make taxes disappear',
          'To guarantee the stock price rises tomorrow',
        ],
        correct: 'To buy more shares over time',
      },
    ],
  },
  {
    id: 'costs',
    badge: '7',
    skill: 'Costs',
    title: '7. Fees and hidden costs',
    text: 'Investing can have costs, like fund fees, trading fees, and taxes. Small costs can matter a lot over many years.',
    check: 'Smart investors ask: what does this cost me?',
    questions: [
      {
        question: 'Why do fees matter more over a long time?',
        choices: [
          'They can reduce how much money keeps growing',
          'They only happen when you lose money',
          'They make risk disappear',
        ],
        correct: 'They can reduce how much money keeps growing',
      },
      {
        question: 'Which is usually better if two similar funds do the same job?',
        choices: [
          'The one with lower costs',
          'The one with the longest name',
          'The one with the brightest logo',
        ],
        correct: 'The one with lower costs',
      },
      {
        question: 'What is a hidden cost of trading too often?',
        choices: [
          'Fees, taxes, and mistakes can add up',
          'You automatically become a professional',
          'Every trade becomes safer than holding',
        ],
        correct: 'Fees, taxes, and mistakes can add up',
      },
    ],
  },
  {
    id: 'plan',
    badge: '8',
    skill: 'Plan',
    title: '8. Building a long-term plan',
    text: 'A plan helps you decide before emotions take over. Good plans include goals, time, risk level, and rules for what to do when prices move.',
    check: 'The best plan is one you can follow when the market feels exciting or scary.',
    questions: [
      {
        question: 'Why can a plan help during a market drop?',
        choices: [
          'It helps you avoid making choices only from fear',
          'It guarantees prices recover the next day',
          'It tells companies what their stock price should be',
        ],
        correct: 'It helps you avoid making choices only from fear',
      },
      {
        question: 'Which goal needs the most caution with risky investments?',
        choices: [
          'Money needed in the next few months',
          'Pretend money in a practice game',
          'Money someone will not touch for decades',
        ],
        correct: 'Money needed in the next few months',
      },
      {
        question: 'What should a long-term investor usually avoid?',
        choices: [
          'Changing the whole plan because of one noisy day',
          'Learning what they own',
          'Checking if fees are reasonable',
        ],
        correct: 'Changing the whole plan because of one noisy day',
      },
    ],
  },
  ...makeGeneratedLessons(),
];

function makeGeneratedLessons() {
  const topics = [
    {
      skill: 'Research',
      idea: 'researching a company before pretending to invest',
      good: 'Reading what the company does and how it makes money',
      bad: 'Buying only because the logo looks cool',
    },
    {
      skill: 'Volatility',
      idea: 'prices moving up and down quickly',
      good: 'Expecting short-term prices to move around',
      bad: 'Thinking a bumpy price means the company is automatically bad',
    },
    {
      skill: 'Goals',
      idea: 'matching investments to a money goal',
      good: 'Choosing safer choices for money needed soon',
      bad: 'Taking huge risks with money needed next month',
    },
    {
      skill: 'News',
      idea: 'checking whether news really changes a business',
      good: 'Asking if the news changes future profits or risk',
      bad: 'Reacting to every headline without thinking',
    },
    {
      skill: 'Patience',
      idea: 'giving a good plan enough time',
      good: 'Reviewing a plan calmly instead of changing it every day',
      bad: 'Switching plans whenever the price wiggles',
    },
    {
      skill: 'Watchlist',
      idea: 'tracking companies before pretending to buy',
      good: 'Writing down why a company is interesting',
      bad: 'Adding random tickers without knowing what they do',
    },
    {
      skill: 'Risk Level',
      idea: 'knowing how much uncertainty you can handle',
      good: 'Picking investments that fit your time and comfort level',
      bad: 'Choosing the riskiest thing because it sounds exciting',
    },
    {
      skill: 'Review',
      idea: 'checking a portfolio without panicking',
      good: 'Reviewing occasionally with clear rules',
      bad: 'Checking every minute and changing everything',
    },
  ];

  return Array.from({ length: 92 }, (_, index) => {
    const levelNumber = index + 9;
    const topic = topics[index % topics.length];

    return {
      id: `generated-${levelNumber}`,
      badge: String(levelNumber),
      skill: topic.skill,
      title: `${levelNumber}. ${topic.skill} practice`,
      text: `This practice level is about ${topic.idea}. Use facts, patience, and risk control before making a pretend investing decision.`,
      check: `Level ${levelNumber} rule: ${topic.good}.`,
      questions: [
        {
          question: `Level ${levelNumber}: which action shows strong ${topic.skill.toLowerCase()} thinking?`,
          choices: [topic.good, topic.bad, 'Copying the loudest person online'],
          correct: topic.good,
        },
        {
          question: `What mistake should you avoid in level ${levelNumber}?`,
          choices: [
            topic.bad,
            'Checking facts before choosing',
            'Thinking about risk before reward',
          ],
          correct: topic.bad,
        },
        {
          question: `Why does ${topic.skill.toLowerCase()} matter for a pretend investor?`,
          choices: [
            'It helps decisions use facts instead of guesses',
            'It guarantees every trade makes money',
            'It means risk no longer exists',
          ],
          correct: 'It helps decisions use facts instead of guesses',
        },
      ],
    };
  });
}

const terms = [
  ['Stock', 'A small ownership piece of a company.'],
  ['Share', 'One unit of a stock.'],
  ['Portfolio', 'All the investments someone owns.'],
  ['Risk', 'The chance that an investment loses value.'],
  ['Return', 'How much money an investment gains or loses.'],
  ['Dividend', 'Money some companies pay to shareholders.'],
];

const scenarios = [
  {
    label: 'Price drops because the whole market is nervous',
    action: 'Pause and learn',
    detail: 'One red day can happen even to strong companies. A long-term investor usually checks facts before reacting.',
  },
  {
    label: 'Price drops because the company is losing customers',
    action: 'Review carefully',
    detail: 'That might be a real problem. It could be a reason to sell in a pretend portfolio, but only after understanding the business.',
  },
  {
    label: 'Price rises fast because everyone online is hyping it',
    action: 'Be careful',
    detail: 'Hype can disappear quickly. Buying only because people are shouting is risky.',
  },
];

const lessonPlaces = [
  { name: 'Village', scene: 'village' },
  { name: 'Bazaar', scene: 'bazaar' },
  { name: 'City', scene: 'city' },
  { name: 'Harbor', scene: 'harbor' },
  { name: 'Forest Camp', scene: 'forest' },
  { name: 'Mountain Bank', scene: 'mountain' },
  { name: 'Tech Park', scene: 'tech' },
  { name: 'Space Port', scene: 'space' },
] as const;

function getLessonPlace(index: number) {
  return lessonPlaces[index % lessonPlaces.length];
}

function getLessonDifficulty(index: number) {
  if (index < 34) {
    return 'Easy';
  }

  if (index < 67) {
    return 'Medium';
  }

  return 'Hard';
}

function getDifficultyBounds(difficulty: LessonDifficulty) {
  if (difficulty === 'Easy') {
    return { start: 0, end: 33 };
  }

  if (difficulty === 'Medium') {
    return { start: 34, end: 66 };
  }

  return { start: 67, end: lessons.length - 1 };
}

const lessonDifficultyOptions: LessonDifficulty[] = ['Easy', 'Medium', 'Hard'];

const kidKnownCompanies = [
  {
    name: 'Apple',
    symbol: 'AAPL',
    exchange: 'Nasdaq',
    sector: 'Consumer tech',
    country: 'United States',
    founded: '1976',
    knownFor: 'iPhone, iPad, Mac, AirPods',
    business: 'Apple makes devices, software, services, and accessories that work together in one ecosystem.',
    learnerFocus: 'Watch how iPhone sales, services growth, and new product launches affect the business.',
    revenueStream: 'Device sales, App Store fees, subscriptions, accessories',
    risk: 'A few product lines create a large part of sales.',
  },
  {
    name: 'Samsung',
    symbol: '005930.KS',
    exchange: 'Korea Exchange',
    sector: 'Electronics',
    country: 'South Korea',
    founded: '1938',
    knownFor: 'Galaxy phones, TVs, tablets',
    business: 'Samsung Electronics sells phones, TVs, appliances, displays, and memory chips around the world.',
    learnerFocus: 'Study how chip demand and phone competition can change profits.',
    revenueStream: 'Semiconductors, phones, TVs, appliances, displays',
    risk: 'Memory chip prices can rise and fall in cycles.',
  },
  {
    name: 'Nintendo',
    symbol: 'NTDOY',
    exchange: 'OTC ADR',
    sector: 'Video games',
    country: 'Japan',
    founded: '1889',
    knownFor: 'Switch, Mario, Zelda',
    business: 'Nintendo makes game consoles, games, characters, and licensing deals around famous franchises.',
    learnerFocus: 'Look at console cycles, hit games, and how old characters keep earning money.',
    revenueStream: 'Consoles, games, digital sales, licensing',
    risk: 'Sales can depend heavily on the success of each console generation.',
  },
  {
    name: 'Disney',
    symbol: 'DIS',
    exchange: 'NYSE',
    sector: 'Entertainment',
    country: 'United States',
    founded: '1923',
    knownFor: 'Movies, parks, Marvel, Pixar',
    business: 'Disney earns money from parks, movies, streaming, TV networks, cruises, and character licensing.',
    learnerFocus: 'Compare steady park income with riskier movie and streaming results.',
    revenueStream: 'Theme parks, streaming, movies, TV, merchandise',
    risk: 'Entertainment hits are hard to predict and parks are expensive to run.',
  },
  {
    name: 'Roblox',
    symbol: 'RBLX',
    exchange: 'NYSE',
    sector: 'Gaming platform',
    country: 'United States',
    founded: '2004',
    knownFor: 'Roblox games and creators',
    business: 'Roblox runs an online platform where players and creators build, share, and spend Robux.',
    learnerFocus: 'Track users, bookings, creator payouts, and whether the platform can become profitable.',
    revenueStream: 'Robux sales, subscriptions, creator marketplace fees',
    risk: 'Fast growth can still come with losses and safety costs.',
  },
  {
    name: 'Nike',
    symbol: 'NKE',
    exchange: 'NYSE',
    sector: 'Apparel',
    country: 'United States',
    founded: '1964',
    knownFor: 'Shoes, sportswear, athletes',
    business: 'Nike designs and sells shoes, clothing, and sports gear through stores, websites, and partners.',
    learnerFocus: 'Watch brand strength, athlete deals, inventory, and direct-to-consumer sales.',
    revenueStream: 'Shoes, apparel, equipment, direct online sales',
    risk: 'Trends change quickly and inventory mistakes can hurt margins.',
  },
  {
    name: 'Microsoft',
    symbol: 'MSFT',
    exchange: 'Nasdaq',
    sector: 'Software and cloud',
    country: 'United States',
    founded: '1975',
    knownFor: 'Xbox, Minecraft, Windows',
    business: 'Microsoft sells software, cloud services, business tools, games, devices, and AI products.',
    learnerFocus: 'Study Azure cloud growth, Office subscriptions, gaming, and AI spending.',
    revenueStream: 'Cloud, Microsoft 365, Windows, Xbox, LinkedIn',
    risk: 'Cloud and AI competition can be expensive.',
  },
  {
    name: 'Sony',
    symbol: 'SONY',
    exchange: 'NYSE ADR',
    sector: 'Entertainment and electronics',
    country: 'Japan',
    founded: '1946',
    knownFor: 'PlayStation, cameras, movies',
    business: 'Sony sells PlayStation products, image sensors, music, movies, electronics, and financial services.',
    learnerFocus: 'Compare gaming, sensors, music, and movies because Sony is several businesses in one.',
    revenueStream: 'Games, sensors, music, movies, electronics',
    risk: 'Hardware cycles and entertainment releases can make results uneven.',
  },
  {
    name: 'Alphabet',
    symbol: 'GOOGL',
    exchange: 'Nasdaq',
    sector: 'Internet services',
    country: 'United States',
    founded: '1998',
    knownFor: 'Google Search, YouTube, Android',
    business: 'Alphabet owns Google, YouTube, Android, Google Cloud, and research projects.',
    learnerFocus: 'Watch advertising, YouTube, cloud growth, and how AI changes search.',
    revenueStream: 'Search ads, YouTube ads, cloud, app store fees',
    risk: 'Most revenue still comes from advertising.',
  },
  {
    name: 'Amazon',
    symbol: 'AMZN',
    exchange: 'Nasdaq',
    sector: 'E-commerce and cloud',
    country: 'United States',
    founded: '1994',
    knownFor: 'Shopping, Prime Video, deliveries',
    business: 'Amazon runs online stores, Prime, advertising, streaming, devices, and Amazon Web Services.',
    learnerFocus: 'Separate retail profits from AWS cloud profits because they behave differently.',
    revenueStream: 'Online stores, AWS, ads, subscriptions, third-party seller fees',
    risk: 'Retail delivery is huge but can have thin profit margins.',
  },
  {
    name: 'Netflix',
    symbol: 'NFLX',
    exchange: 'Nasdaq',
    sector: 'Streaming',
    country: 'United States',
    founded: '1997',
    knownFor: 'Shows, movies, streaming',
    business: 'Netflix sells streaming memberships and ads while producing and licensing shows and movies.',
    learnerFocus: 'Watch subscribers, pricing, content spending, and ad-supported plans.',
    revenueStream: 'Subscriptions, advertising plans, content licensing',
    risk: 'Making popular shows costs a lot and competition is intense.',
  },
  {
    name: 'Spotify',
    symbol: 'SPOT',
    exchange: 'NYSE',
    sector: 'Audio streaming',
    country: 'Sweden',
    founded: '2006',
    knownFor: 'Music, podcasts, playlists',
    business: 'Spotify streams music, podcasts, and audiobooks with free ad-supported and paid plans.',
    learnerFocus: 'Study users, premium subscribers, royalties, ads, and podcast investments.',
    revenueStream: 'Premium subscriptions, ads, podcast tools, audiobooks',
    risk: 'Music royalties can make profits harder to grow.',
  },
  {
    name: 'Tesla',
    symbol: 'TSLA',
    exchange: 'Nasdaq',
    sector: 'Electric vehicles',
    country: 'United States',
    founded: '2003',
    knownFor: 'Electric cars and batteries',
    business: 'Tesla sells electric vehicles, batteries, charging, software features, and energy products.',
    learnerFocus: 'Watch car deliveries, margins, battery costs, charging, and software income.',
    revenueStream: 'Vehicle sales, energy storage, charging, software',
    risk: 'Car prices, competition, and factory costs can change quickly.',
  },
  {
    name: 'Coca-Cola',
    symbol: 'KO',
    exchange: 'NYSE',
    sector: 'Beverages',
    country: 'United States',
    founded: '1892',
    knownFor: 'Drinks and famous brands',
    business: 'Coca-Cola owns beverage brands and works with bottlers that make and distribute drinks.',
    learnerFocus: 'Look at brand power, pricing, international sales, and dividend history.',
    revenueStream: 'Drink concentrates, syrups, finished beverages, licensing',
    risk: 'Tastes can change and sugary drinks face health pressure.',
  },
  {
    name: "McDonald's",
    symbol: 'MCD',
    exchange: 'NYSE',
    sector: 'Restaurants',
    country: 'United States',
    founded: '1940',
    knownFor: 'Restaurants, fries, Happy Meals',
    business: "McDonald's runs and franchises restaurants, earning money from food sales, rent, and franchise fees.",
    learnerFocus: 'Study same-store sales, franchising, menu pricing, and restaurant traffic.',
    revenueStream: 'Restaurant sales, franchise fees, rent from franchisees',
    risk: 'Food costs, labor costs, and customer habits can pressure profits.',
  },
  {
    name: 'Meta',
    symbol: 'META',
    exchange: 'Nasdaq',
    sector: 'Social media',
    country: 'United States',
    founded: '2004',
    knownFor: 'Instagram, WhatsApp, VR',
    business: 'Meta owns Facebook, Instagram, WhatsApp, Threads, Messenger, and virtual reality projects.',
    learnerFocus: 'Watch ad revenue, user time, AI spending, and Reality Labs losses.',
    revenueStream: 'Advertising, business messaging, VR hardware and software',
    risk: 'Advertising rules, privacy changes, and VR spending can affect results.',
  },
];

const investingFacts = [
  'A stock price can move because people disagree about what a company is worth.',
  'Diversification means spreading money out instead of relying on one company.',
  'Compound growth works best when it has lots of time.',
  'A famous brand is not automatically a good investment.',
  'Risk means the result can be different from what you expected.',
  'Short-term price moves can be noisy, even when a company is still strong.',
  'A portfolio is the collection of investments someone owns.',
  'Investing money you need soon can be dangerous because prices can fall.',
  'A share is a tiny ownership piece of a company.',
  'Companies can grow sales but still lose money if their costs are too high.',
  'Market news can change prices before most people fully understand the story.',
  'A dividend is money some companies share with owners, but not every company pays one.',
  'Buying only because a price went down is risky if the business is getting weaker.',
  'Great investors often care more about patience than perfect timing.',
  'Fees are small costs that can quietly reduce returns over many years.',
  'An index fund owns many investments at once, which can make it more diversified.',
  'Cash is useful because it does not jump around like stocks, but it may grow more slowly.',
  'A company can be popular with kids and still be too expensive as a stock.',
  'The stock market is not one person deciding prices; it is many buyers and sellers.',
  'A watchlist helps you study companies before making a pretend decision.',
  'Panic selling means making a decision mainly because you feel scared.',
  'Long-term investing means thinking in years, not minutes.',
  'A business moat is something that helps a company stay strong against competitors.',
  'Revenue is money a company brings in before paying all its costs.',
  'Profit is what can be left after a company pays its costs.',
  'A stock chart shows what happened before, but it cannot perfectly predict what happens next.',
  'Owning one stock can feel exciting, but owning many can reduce one-company risk.',
  'The safest choice depends on the goal and how soon the money is needed.',
];

const tradeNews = [
  'New product rumors make traders excited, but nobody knows if the excitement will last.',
  'The company reports stronger sales than expected, then the price starts moving quickly.',
  'A popular creator talks about the brand online, so the stock gets extra attention.',
  'The whole market feels nervous today, even for companies people know well.',
  "Investors disagree about whether today's news is actually important.",
  'The price jumps early, but quick moves can reverse before the pretend market closes.',
];

const fakeMarketNews = [
  {
    company: 'Nintendo',
    headline: 'Nintendo just announced the date for Mario 10',
    detail: 'Pretend traders are guessing whether a big game launch could help sales.',
  },
  {
    company: 'Apple',
    headline: 'Apple shows a lighter iPad for school projects',
    detail: 'Some investors think student products could be a useful long-term area.',
  },
  {
    company: 'Samsung',
    headline: 'Samsung reveals a foldable phone with a stronger screen',
    detail: 'New tech can excite customers, but high prices can still slow demand.',
  },
  {
    company: 'Roblox',
    headline: 'Roblox creators get new tools for building worlds',
    detail: 'More creator activity can be good, but the company still has to earn money.',
  },
  {
    company: 'Disney',
    headline: 'Disney opens a new Marvel ride at a theme park',
    detail: 'Fun announcements can help attention, but parks also cost a lot to run.',
  },
  {
    company: 'Nike',
    headline: 'Nike signs a famous young soccer star',
    detail: 'Brand deals can boost hype, but hype is not the same as guaranteed profit.',
  },
];

const themes = [
  { id: 'fresh', label: 'Fresh' },
  { id: 'arcade', label: 'Arcade' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'forest', label: 'Forest' },
  { id: 'candy', label: 'Candy' },
  { id: 'space', label: 'Space' },
  { id: 'lemon', label: 'Lemon' },
] as const;

type ThemeId = (typeof themes)[number]['id'];

const currencies = [
  { id: 'USD', label: 'US Dollar' },
  { id: 'KZT', label: 'Kazakhstani Tenge' },
  { id: 'EUR', label: 'Euro' },
  { id: 'GBP', label: 'British Pound' },
  { id: 'JPY', label: 'Japanese Yen' },
] as const;

type CurrencyId = (typeof currencies)[number]['id'];

const languages = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'kk', label: 'Қазақша' },
  { id: 'es', label: 'Español' },
] as const;

type LanguageId = (typeof languages)[number]['id'];

const translations: Record<LanguageId, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.lessons': 'Lessons',
    'nav.facts': 'Facts',
    'nav.trading': 'Market',
    'nav.shop': 'Shop',
    'nav.companies': 'Companies',
    'nav.decision-lab': 'Decision Lab',
    'nav.calculator': 'Calculator',
    'nav.dictionary': 'Dictionary',
    'nav.quick-check': 'Quiz',
    'nav.achievements': 'Achievements',
    'nav.piggy-bank': 'Piggy Bank',
    'nav.help': 'Help',
    'nav.account': 'Account',
    'nav.settings': 'Settings',
    'settings.title': 'Customize the site',
    'settings.copy': 'Change the background, language, currency, music, and cursor from one place.',
    'settings.language': 'Language',
    'settings.currency': 'Currency',
    'piggy.eyebrow': 'Piggy bank',
    'piggy.title': 'Your real-life money',
    'piggy.copy': 'Track cash you find, save, or spend outside the game.',
    'piggy.balance': 'Real balance',
    'piggy.balanceHelp': 'Use this for actual money you have saved in real life.',
    'piggy.gameCash': 'Game cash',
    'piggy.realCurrency': 'Real currency',
    'piggy.quickAdd': 'Quick add',
    'piggy.status': 'Status',
    'piggy.saving': 'Saving',
    'piggy.empty': 'Empty',
    'piggy.addMoney': 'Add money',
    'piggy.customAmount': 'Custom amount',
    'piggy.add': 'Add',
    'piggy.spend': 'Spend or correct',
    'piggy.spendHelp': 'Use subtract when you spend real money or entered too much.',
  },
  ru: {
    'nav.home': 'Главная',
    'nav.lessons': 'Уроки',
    'nav.facts': 'Факты',
    'nav.trading': 'Рынок',
    'nav.shop': 'Магазин',
    'nav.companies': 'Компании',
    'nav.decision-lab': 'Решения',
    'nav.calculator': 'Калькулятор',
    'nav.dictionary': 'Словарь',
    'nav.quick-check': 'Квиз',
    'nav.achievements': 'Достижения',
    'nav.piggy-bank': 'Копилка',
    'nav.help': 'Помощь',
    'nav.account': 'Аккаунт',
    'nav.settings': 'Настройки',
    'settings.title': 'Настроить сайт',
    'settings.copy': 'Меняй фон, язык, валюту, музыку и курсор в одном месте.',
    'settings.language': 'Язык',
    'settings.currency': 'Валюта',
    'piggy.eyebrow': 'Копилка',
    'piggy.title': 'Твои реальные деньги',
    'piggy.copy': 'Отслеживай деньги, которые ты нашёл, сохранил или потратил вне игры.',
    'piggy.balance': 'Реальный баланс',
    'piggy.balanceHelp': 'Используй это для настоящих денег, которые у тебя есть.',
    'piggy.gameCash': 'Игровые деньги',
    'piggy.realCurrency': 'Реальная валюта',
    'piggy.quickAdd': 'Быстро добавить',
    'piggy.status': 'Статус',
    'piggy.saving': 'Копишь',
    'piggy.empty': 'Пусто',
    'piggy.addMoney': 'Добавить деньги',
    'piggy.customAmount': 'Своя сумма',
    'piggy.add': 'Добавить',
    'piggy.spend': 'Потратить или исправить',
    'piggy.spendHelp': 'Вычитай, когда потратил реальные деньги или ввёл слишком много.',
  },
  kk: {
    'nav.home': 'Басты бет',
    'nav.lessons': 'Сабақтар',
    'nav.facts': 'Фактілер',
    'nav.trading': 'Нарық',
    'nav.shop': 'Дүкен',
    'nav.companies': 'Компаниялар',
    'nav.decision-lab': 'Шешімдер',
    'nav.calculator': 'Калькулятор',
    'nav.dictionary': 'Сөздік',
    'nav.quick-check': 'Квиз',
    'nav.achievements': 'Жетістіктер',
    'nav.piggy-bank': 'Қоржын',
    'nav.help': 'Көмек',
    'nav.account': 'Аккаунт',
    'nav.settings': 'Баптаулар',
    'settings.title': 'Сайтты баптау',
    'settings.copy': 'Фонды, тілді, валютаны, музыканы және курсорды бір жерден өзгерт.',
    'settings.language': 'Тіл',
    'settings.currency': 'Валюта',
    'piggy.eyebrow': 'Қоржын',
    'piggy.title': 'Шынайы ақшаң',
    'piggy.copy': 'Ойыннан тыс тапқан, жинаған немесе жұмсаған ақшаңды бақыла.',
    'piggy.balance': 'Шынайы баланс',
    'piggy.balanceHelp': 'Мұны өзіңдегі нақты ақша үшін қолдан.',
    'piggy.gameCash': 'Ойын ақшасы',
    'piggy.realCurrency': 'Нақты валюта',
    'piggy.quickAdd': 'Тез қосу',
    'piggy.status': 'Күйі',
    'piggy.saving': 'Жинап жатырсың',
    'piggy.empty': 'Бос',
    'piggy.addMoney': 'Ақша қосу',
    'piggy.customAmount': 'Өз сомаң',
    'piggy.add': 'Қосу',
    'piggy.spend': 'Жұмсау немесе түзету',
    'piggy.spendHelp': 'Нақты ақша жұмсасаң немесе артық енгізсең, азайт.',
  },
  es: {
    'nav.home': 'Inicio',
    'nav.lessons': 'Lecciones',
    'nav.facts': 'Datos',
    'nav.trading': 'Mercado',
    'nav.shop': 'Tienda',
    'nav.companies': 'Empresas',
    'nav.decision-lab': 'Decisiones',
    'nav.calculator': 'Calculadora',
    'nav.dictionary': 'Diccionario',
    'nav.quick-check': 'Quiz',
    'nav.achievements': 'Logros',
    'nav.piggy-bank': 'Alcancía',
    'nav.help': 'Ayuda',
    'nav.account': 'Cuenta',
    'nav.settings': 'Ajustes',
    'settings.title': 'Personaliza el sitio',
    'settings.copy': 'Cambia fondo, idioma, moneda, música y cursor desde un solo lugar.',
    'settings.language': 'Idioma',
    'settings.currency': 'Moneda',
    'piggy.eyebrow': 'Alcancía',
    'piggy.title': 'Tu dinero real',
    'piggy.copy': 'Registra el dinero que encuentras, ahorras o gastas fuera del juego.',
    'piggy.balance': 'Saldo real',
    'piggy.balanceHelp': 'Usa esto para el dinero real que tienes ahorrado.',
    'piggy.gameCash': 'Dinero del juego',
    'piggy.realCurrency': 'Moneda real',
    'piggy.quickAdd': 'Añadir rápido',
    'piggy.status': 'Estado',
    'piggy.saving': 'Ahorrando',
    'piggy.empty': 'Vacío',
    'piggy.addMoney': 'Añadir dinero',
    'piggy.customAmount': 'Cantidad',
    'piggy.add': 'Añadir',
    'piggy.spend': 'Gastar o corregir',
    'piggy.spendHelp': 'Resta cuando gastes dinero real o hayas puesto demasiado.',
  },
};

const cursorDesigns = [
  { id: 'arrow', label: 'Arrow' },
  { id: 'dot', label: 'Dot' },
  { id: 'plus', label: 'Plus' },
  { id: 'ring', label: 'Ring' },
  { id: 'star', label: 'Star' },
  { id: 'target', label: 'Target' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'bolt', label: 'Bolt' },
] as const;

const cursorColors = [
  { id: 'green', label: 'Green', value: '#1f7a4f' },
  { id: 'blue', label: 'Blue', value: '#275f8f' },
  { id: 'gold', label: 'Gold', value: '#d6a638' },
  { id: 'pink', label: 'Pink', value: '#d9468f' },
  { id: 'red', label: 'Red', value: '#b94646' },
  { id: 'purple', label: 'Purple', value: '#7b2ff2' },
  { id: 'teal', label: 'Teal', value: '#087c8f' },
  { id: 'black', label: 'Black', value: '#17211b' },
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'orange', label: 'Orange', value: '#c6532f' },
] as const;

type CursorDesignId = (typeof cursorDesigns)[number]['id'];
type CursorColorId = (typeof cursorColors)[number]['id'];

const musicTracks = [
  {
    id: 'focus',
    name: 'Ode to Joy',
    bpm: 92,
    song: [
      330, 330, 349, 392, 392, 349, 330, 294,
      262, 262, 294, 330, 330, 294, 294, null,
      330, 330, 349, 392, 392, 349, 330, 294,
      262, 262, 294, 330, 294, 262, 262, null,
      294, 294, 330, 262, 294, 330, 349, 330,
      262, 294, 330, 349, 330, 294, 262, 294,
      330, 330, 349, 392, 392, 349, 330, 294,
      262, 262, 294, 330, 294, 262, 262, null,
    ],
    bassLine: [131, 131, 196, 196, 175, 175, 196, 196, 131, 131, 196, 196, 175, 196, 131, 131],
    chord: [1, 1.25, 1.5],
  },
  {
    id: 'arcade',
    name: 'Twinkle Twinkle',
    bpm: 88,
    song: [
      262, 262, 392, 392, 440, 440, 392, null,
      349, 349, 330, 330, 294, 294, 262, null,
      392, 392, 349, 349, 330, 330, 294, null,
      392, 392, 349, 349, 330, 330, 294, null,
      262, 262, 392, 392, 440, 440, 392, null,
      349, 349, 330, 330, 294, 294, 262, null,
      262, 330, 392, null, 440, 392, 330, null,
      349, 330, 294, null, 262, null, 262, null,
    ],
    bassLine: [131, 131, 196, 196, 220, 220, 196, 196, 175, 165, 147, 147, 131, 131, 131, 131],
    chord: [1, 1.2, 1.5],
  },
  {
    id: 'chill',
    name: 'Mozart Theme',
    bpm: 100,
    song: [
      392, 330, 392, 330, 392, 494, 587, null,
      523, 494, 440, 392, 349, 330, 294, null,
      330, 349, 392, 440, 494, 523, 587, null,
      659, 587, 523, 494, 440, 392, 330, null,
      392, 330, 392, 330, 392, 494, 587, null,
      523, 494, 440, 392, 349, 330, 294, null,
      330, 392, 523, 659, 587, 523, 494, 440,
      392, null, 330, null, 294, null, 262, null,
    ],
    bassLine: [196, 196, 165, 165, 196, 247, 294, 294, 262, 247, 220, 196, 175, 165, 147, 147],
    chord: [1, 1.25, 2],
  },
  {
    id: 'rush',
    name: 'Piano Rush',
    bpm: 154,
    song: [
      659, 659, 659, 784, 659, 988, 880, 784,
      659, 659, 784, 988, 1175, 988, 880, 784,
      698, 698, 698, 880, 698, 1047, 988, 880,
      698, 784, 880, 1047, 1319, 1175, 1047, 988,
      784, 784, 988, 784, 1175, 988, 1319, 1175,
      1047, 988, 880, 784, 698, 784, 880, 988,
      659, 784, 988, 1175, 1319, 1175, 988, 784,
      659, 659, 784, 659, 988, 659, 1175, null,
      523, 659, 784, 988, 784, 659, 523, 659,
      587, 740, 880, 1175, 880, 740, 587, 740,
      659, 784, 988, 1319, 988, 784, 659, 784,
      698, 880, 1047, 1397, 1047, 880, 698, null,
    ],
    bassLine: [165, 165, 247, 247, 175, 175, 262, 262, 196, 196, 294, 294, 220, 247, 165, 165],
    chord: [1, 2],
  },
  {
    id: 'rowboat',
    name: 'Row Your Boat',
    bpm: 96,
    song: [
      262, 262, 262, 294, 330, null, 330, 294,
      330, 349, 392, null, 523, 523, 523, 392,
      392, 392, 330, 330, 330, 262, 262, 262,
      392, 349, 330, 294, 262, null, 262, null,
      262, 294, 330, 262, 330, 349, 392, null,
      523, 392, 330, 262, 392, 349, 330, null,
    ],
    bassLine: [131, 131, 165, 165, 196, 196, 165, 165, 131, 165, 196, 165],
    chord: [1, 1.25, 1.5],
  },
  {
    id: 'waltz',
    name: 'Little Waltz',
    bpm: 132,
    song: [
      392, null, 494, 587, null, 494, 392, null,
      440, null, 523, 659, null, 523, 440, null,
      349, null, 440, 523, null, 440, 349, null,
      392, null, 494, 587, 659, 587, 494, null,
      523, null, 659, 784, null, 659, 523, null,
      440, null, 523, 659, null, 523, 440, null,
      392, 440, 494, 587, 523, 494, 440, 392,
      349, null, 392, null, 330, null, 294, null,
    ],
    bassLine: [196, 196, 220, 220, 175, 175, 196, 196, 262, 262, 220, 220, 196, 196, 147, 147],
    chord: [1, 1.25, 1.5],
  },
  {
    id: 'minor',
    name: 'Moonlight Run',
    bpm: 86,
    song: [
      330, 392, 494, 392, 330, 392, 494, 392,
      294, 349, 440, 349, 294, 349, 440, 349,
      262, 330, 392, 330, 262, 330, 392, 330,
      247, 294, 370, 294, 247, null, 247, null,
      392, 494, 659, 494, 392, 494, 659, 494,
      349, 440, 587, 440, 349, 440, 587, 440,
      330, 392, 494, 523, 494, 392, 330, 294,
      262, null, 247, null, 220, null, 196, null,
    ],
    bassLine: [165, 165, 147, 147, 131, 131, 123, 123, 196, 196, 175, 175, 165, 147, 131, 123],
    chord: [1, 1.2, 1.5],
  },
  {
    id: 'boss',
    name: 'Boss Piano',
    bpm: 176,
    song: [
      784, 988, 1175, 988, 784, 988, 1319, 988,
      740, 932, 1175, 932, 740, 932, 1245, 932,
      698, 880, 1047, 880, 698, 880, 1175, 880,
      659, 784, 988, 784, 659, 784, 1047, null,
      988, 1175, 1319, 1568, 1319, 1175, 988, 784,
      880, 1047, 1175, 1397, 1175, 1047, 880, 698,
      784, 988, 1175, 1568, 1760, 1568, 1175, 988,
      784, 740, 698, 659, 587, null, 523, null,
    ],
    bassLine: [196, 196, 247, 247, 175, 175, 220, 220, 262, 247, 220, 196, 175, 165, 147, 131],
    chord: [1, 1.5],
  },
  {
    id: 'red-light',
    name: 'Red Light Pulse',
    bpm: 72,
    song: [
      330, null, 330, null, 311, null, 294, null,
      262, null, 294, null, 311, null, 330, null,
      392, null, 370, null, 330, null, 294, null,
      262, null, 247, null, 262, null, 294, null,
      330, null, 330, null, 392, null, 370, null,
      330, null, 294, null, 262, null, 247, null,
      220, null, 247, null, 262, null, 294, null,
      330, null, 294, null, 262, null, 247, null,
    ],
    bassLine: [82, 82, 82, 98, 82, 82, 73, 73, 82, 82, 98, 98, 82, 73, 65, 65],
    chord: [1, 1.5],
  },
  {
    id: 'glass-bridge',
    name: 'Glass Bridge Tension',
    bpm: 108,
    song: [
      440, null, 415, 440, null, 523, 494, null,
      392, null, 415, null, 349, 370, null, 330,
      294, null, 330, 349, null, 415, 392, null,
      330, null, 311, null, 294, null, 262, null,
      440, 523, null, 494, 440, null, 415, null,
      392, null, 349, 392, null, 415, 349, null,
      330, null, 294, 330, null, 370, 330, null,
      262, null, 247, null, 220, null, 196, null,
    ],
    bassLine: [110, 110, 98, 98, 87, 87, 82, 82, 110, 98, 87, 82, 73, 73, 65, 65],
    chord: [1, 1.2, 1.5],
  },
  {
    id: 'final-round',
    name: 'Final Round Waltz',
    bpm: 138,
    song: [
      523, null, 494, 440, null, 392, 370, null,
      392, null, 440, 494, null, 523, 587, null,
      659, null, 587, 523, null, 494, 440, null,
      392, null, 370, 330, null, 294, 262, null,
      330, 392, null, 494, 440, null, 392, null,
      370, 440, null, 523, 494, null, 440, null,
      392, 494, null, 587, 523, null, 494, null,
      440, null, 392, null, 330, null, 262, null,
    ],
    bassLine: [131, 131, 196, 196, 165, 165, 196, 196, 147, 147, 220, 220, 131, 196, 131, 131],
    chord: [1, 1.25, 1.5],
  },
] as const;

type MusicTrackId = (typeof musicTracks)[number]['id'];
type SectionId =
  | 'home'
  | 'lessons'
  | 'facts'
  | 'trading'
  | 'shop'
  | 'companies'
  | 'decision-lab'
  | 'calculator'
  | 'dictionary'
  | 'quick-check'
  | 'achievements'
  | 'piggy-bank'
  | 'secret-game'
  | 'help'
  | 'account'
  | 'settings';

const sidebarItems: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'lessons', label: 'Lessons', icon: '▣' },
  { id: 'facts', label: 'Facts', icon: 'i' },
  { id: 'trading', label: 'Market', icon: '$' },
  { id: 'shop', label: 'Shop', icon: '◈' },
  { id: 'companies', label: 'Companies', icon: '◆' },
  { id: 'decision-lab', label: 'Decision Lab', icon: '?' },
  { id: 'calculator', label: 'Calculator', icon: '+' },
  { id: 'dictionary', label: 'Dictionary', icon: 'A' },
  { id: 'quick-check', label: 'Quiz', icon: '✓' },
  { id: 'achievements', label: 'Achievements', icon: '*' },
  { id: 'piggy-bank', label: 'Piggy Bank', icon: '¢' },
  { id: 'help', label: 'Help', icon: 'AI' },
  { id: 'account', label: 'Account', icon: '@' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeChartPath() {
  const xs = [35, 95, 155, 215, 275, 325];
  const points = xs.map((x) => ({
    x,
    y: Math.round(48 + Math.random() * 106),
  }));

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join('');

  return {
    area: `${line}L325 184L35 184Z`,
    line,
    points,
  };
}

function makeTradeRound(): TradeRound {
  const company = shuffleItems(kidKnownCompanies)[0];
  const startPrice = Math.round(30 + Math.random() * 150);
  const movePercent = Number((Math.random() * 16 - 8).toFixed(1));
  const endPrice = Math.max(5, Number((startPrice * (1 + movePercent / 100)).toFixed(2)));
  const shares = 5;
  const prices = Array.from({ length: 6 }, (_, index) => {
    const progress = index / 5;
    const noise = index === 0 || index === 5 ? 0 : (Math.random() - 0.5) * startPrice * 0.04;
    return Number((startPrice + (endPrice - startPrice) * progress + noise).toFixed(2));
  });
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = Math.max(1, maxPrice - minPrice);
  const xs = [35, 95, 155, 215, 275, 325];
  const points = prices.map((price, index) => ({
    x: xs[index],
    y: Math.round(164 - ((price - minPrice) / range) * 110),
    price,
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join('');

  return {
    company,
    startPrice,
    endPrice,
    shares,
    movePercent,
    news: shuffleItems(tradeNews)[0],
    points,
    line,
    area: `${line}L325 184L35 184Z`,
  };
}

function makeCursorSvg(design: CursorDesignId, color: string) {
  const svg =
    design === 'dot'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="14" cy="14" r="8" fill="${color}" stroke="#17211b" stroke-width="3"/><circle cx="14" cy="14" r="3" fill="#fff"/></svg>`
    : design === 'plus'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 4h5v9h9v5h-9v9h-5v-9H5v-5h9z" fill="${color}" stroke="#17211b" stroke-width="3" stroke-linejoin="round"/></svg>`
    : design === 'ring'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="15" cy="15" r="9" fill="none" stroke="#17211b" stroke-width="5"/><circle cx="15" cy="15" r="9" fill="none" stroke="${color}" stroke-width="3"/><circle cx="15" cy="15" r="2" fill="#17211b"/></svg>`
    : design === 'star'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M16 3l3.5 8 8.5.7-6.4 5.6 1.9 8.4L16 21.3 8.5 25.7l1.9-8.4L4 11.7l8.5-.7z" fill="${color}" stroke="#17211b" stroke-width="3" stroke-linejoin="round"/></svg>`
    : design === 'target'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="#fff" stroke="#17211b" stroke-width="3"/><circle cx="16" cy="16" r="7" fill="none" stroke="${color}" stroke-width="4"/><circle cx="16" cy="16" r="2.8" fill="${color}"/></svg>`
    : design === 'diamond'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M16 3l12 13-12 13L4 16z" fill="${color}" stroke="#17211b" stroke-width="3" stroke-linejoin="round"/><path d="M10 16h12" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`
    : design === 'bolt'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M18 2L7 18h8l-2 12 12-18h-8z" fill="${color}" stroke="#17211b" stroke-width="3" stroke-linejoin="round"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M6 3l18 16-9 1-4 8z" fill="${color}" stroke="#17211b" stroke-width="3" stroke-linejoin="round"/><path d="M12 18l4 8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;

  const hotspot =
    design === 'arrow'
      ? '6 3'
      : design === 'dot'
        ? '14 14'
        : '16 16';

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot}`;
}

function playAnswerSound(isCorrect: boolean) {
  const browserWindow = window as BrowserWindowWithAudio;
  const AudioContext = browserWindow.AudioContext || browserWindow.webkitAudioContext;

  if (!AudioContext) {
    return;
  }

  const audio = new AudioContext();
  const gain = audio.createGain();

  gain.connect(audio.destination);
  gain.gain.setValueAtTime(0.0001, audio.currentTime);

  const playTone = (frequency: number, start: number, duration: number) => {
    const oscillator = audio.createOscillator();

    oscillator.type = isCorrect ? 'sine' : 'square';
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime + start);
    oscillator.connect(gain);
    oscillator.start(audio.currentTime + start);
    oscillator.stop(audio.currentTime + start + duration);
  };

  if (isCorrect) {
    gain.gain.exponentialRampToValueAtTime(0.14, audio.currentTime + 0.02);
    playTone(660, 0, 0.12);
    playTone(880, 0.11, 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.34);
  } else {
    gain.gain.exponentialRampToValueAtTime(0.1, audio.currentTime + 0.02);
    playTone(180, 0, 0.16);
    playTone(130, 0.15, 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.38);
  }
}

function App() {
  const [page, setPage] = useState<'course' | 'lesson'>('course');
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [theme, setTheme] = useState<ThemeId>('fresh');
  const [currency, setCurrency] = useState<CurrencyId>('USD');
  const [language, setLanguage] = useState<LanguageId>('en');
  const [cursorDesign, setCursorDesign] = useState<CursorDesignId>('arrow');
  const [cursorColor, setCursorColor] = useState<CursorColorId>('green');
  const [activeLessonId, setActiveLessonId] = useState(lessons[0].id);
  const [lessonWindowStart, setLessonWindowStart] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [lessonAnswer, setLessonAnswer] = useState('');
  const [lessonHint, setLessonHint] = useState('');
  const [helperMessage, setHelperMessage] = useState('');
  const [lessonMistakes, setLessonMistakes] = useState<LessonMistake[]>([]);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [planetSpinning, setPlanetSpinning] = useState(false);
  const [skippedQuestions, setSkippedQuestions] = useState<string[]>([]);
  const [ownedHints, setOwnedHints] = useState(0);
  const [ownedSkips, setOwnedSkips] = useState(0);
  const [ownedRampages, setOwnedRampages] = useState(0);
  const [ownedBoosters, setOwnedBoosters] = useState<Record<MarketBoosterId, number>>(() =>
    getEmptyBoosters(),
  );
  const [shopMessage, setShopMessage] = useState('');
  const [showByeSign, setShowByeSign] = useState(false);
  const [xp, setXp] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [realPiggyBank, setRealPiggyBank] = useState(0);
  const [realPiggyAmount, setRealPiggyAmount] = useState('1');
  const [secretGameScore, setSecretGameScore] = useState(0);
  const [secretGameTarget, setSecretGameTarget] = useState(() => Math.floor(Math.random() * 9));
  const [secretGameMessage, setSecretGameMessage] = useState('All games are free. Pick one and play.');
  const [activeVaultGame, setActiveVaultGame] = useState<VaultGameId>('tiles');
  const [vaultCodeTarget, setVaultCodeTarget] = useState(() => ['123', '231', '312'][Math.floor(Math.random() * 3)]);
  const [marketDirection, setMarketDirection] = useState<'up' | 'down'>(() =>
    Math.random() > 0.5 ? 'up' : 'down',
  );
  const [snake, setSnake] = useState<SnakeCell[]>([
    { x: 4, y: 5 },
    { x: 3, y: 5 },
    { x: 2, y: 5 },
  ]);
  const [snakeFood, setSnakeFood] = useState<SnakeCell>({ x: 7, y: 5 });
  const [snakeDirection, setSnakeDirection] = useState<SnakeCell>({ x: 1, y: 0 });
  const [snakeRunning, setSnakeRunning] = useState(false);
  const [snakeScore, setSnakeScore] = useState(0);
  const [breakerPaddle, setBreakerPaddle] = useState(42);
  const [breakerBall, setBreakerBall] = useState<BreakerBall>({ x: 50, y: 74, dx: 3, dy: -3 });
  const [breakerBricks, setBreakerBricks] = useState<number[]>(() => getFreshBricks());
  const [breakerRunning, setBreakerRunning] = useState(false);
  const [breakerScore, setBreakerScore] = useState(0);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [displayedAiAnswer, setDisplayedAiAnswer] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [claimedAchievements, setClaimedAchievements] = useState<string[]>([]);
  const [levelNotice, setLevelNotice] = useState<number | null>(null);
  const [lockedMessage, setLockedMessage] = useState('');
  const [startMoney, setStartMoney] = useState(100);
  const [monthlyMoney, setMonthlyMoney] = useState(10);
  const [years, setYears] = useState(10);
  const [answer, setAnswer] = useState('');
  const [tradeRound, setTradeRound] = useState(() => makeTradeRound());
  const [tradeChoice, setTradeChoice] = useState<'buy' | 'sell' | 'hold' | ''>('');
  const [chartMode, setChartMode] = useState<ChartMode>('line');
  const [lessonDifficulty, setLessonDifficulty] = useState<LessonDifficulty>('Easy');
  const [lessonDifficultyChosen, setLessonDifficultyChosen] = useState(false);
  const [activeMarketBoosters, setActiveMarketBoosters] = useState<MarketBoosterId[]>([]);
  const [tradeResult, setTradeResult] = useState<{
    money: number;
    message: string;
  } | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrackId>('focus');
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(35);
  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Sign in to save progress.');
  const musicContextRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const byeTimerRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const planetSpinTimerRef = useRef<number | null>(null);
  const wrongAnswerTimerRef = useRef<number | null>(null);
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];
  const activeQuestion = activeLesson.questions[questionIndex] ?? activeLesson.questions[0];
  const activeLessonIndex = lessons.findIndex((lesson) => lesson.id === activeLesson.id);
  const isFinalQuestion = questionIndex === activeLesson.questions.length - 1;
  const activeQuestionKey = `${activeLesson.id}-${questionIndex}`;
  const wasSkipped = skippedQuestions.includes(activeQuestionKey);
  const level = Math.floor(xp / 100) + 1;
  const xpIntoLevel = xp % 100;
  const totalQuestions = lessons.reduce((total, lesson) => total + lesson.questions.length, 0);
  const progress = Math.round((completedLessons.length / lessons.length) * 100);
  const lessonProgress = Math.round(((questionIndex + (lessonAnswer === activeQuestion.correct ? 1 : 0)) / activeLesson.questions.length) * 100);
  const difficultyBounds = getDifficultyBounds(lessonDifficulty);
  const difficultyLevelCount = difficultyBounds.end - difficultyBounds.start + 1;
  const difficultyLevelNumber = lessonWindowStart - difficultyBounds.start + 1;
  const visibleLessons = lessons.slice(lessonWindowStart, lessonWindowStart + 1);
  const sessionCompanies = useMemo(() => kidKnownCompanies, []);
  const sessionFacts = useMemo(() => shuffleItems(investingFacts).slice(0, 3), []);
  const sessionNews = useMemo(() => shuffleItems(fakeMarketNews).slice(0, 3), []);
  const sessionChart = useMemo(() => makeChartPath(), []);
  const activeMusicTrack =
    musicTracks.find((musicTrack) => musicTrack.id === selectedMusic) ?? musicTracks[0];
  const formatRealMoney = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      currency,
      style: 'currency',
    }).format(amount);
  const t = (key: string) => translations[language][key] ?? translations.en[key] ?? key;
  const activeCursorColor =
    cursorColors.find((colorOption) => colorOption.id === cursorColor) ?? cursorColors[0];
  const cursorStyle = useMemo(
    () =>
      ({
        '--app-cursor': `${makeCursorSvg(cursorDesign, activeCursorColor.value)}, auto`,
      }) as CSSProperties,
    [activeCursorColor.value, cursorDesign],
  );
  const achievements = [
    {
      id: 'first-lesson',
      icon: '1',
      title: 'First Step',
      detail: 'Complete your first lesson.',
      difficulty: 'Easy',
      reward: 50,
      unlocked: completedLessons.length >= 1,
      progress: Math.min(completedLessons.length, 1),
      target: 1,
    },
    {
      id: 'five-lessons',
      icon: '5',
      title: 'Lesson Streak',
      detail: 'Complete 5 lessons.',
      difficulty: 'Medium',
      reward: 250,
      unlocked: completedLessons.length >= 5,
      progress: Math.min(completedLessons.length, 5),
      target: 5,
    },
    {
      id: 'ten-lessons',
      icon: '10',
      title: 'Course Climber',
      detail: 'Complete 10 lessons.',
      difficulty: 'Hard',
      reward: 600,
      unlocked: completedLessons.length >= 10,
      progress: Math.min(completedLessons.length, 10),
      target: 10,
    },
    {
      id: 'twenty-five-lessons',
      icon: '25',
      title: 'Lesson Pro',
      detail: 'Complete 25 lessons.',
      difficulty: 'Very Hard',
      reward: 1200,
      unlocked: completedLessons.length >= 25,
      progress: Math.min(completedLessons.length, 25),
      target: 25,
    },
    {
      id: 'fifty-lessons',
      icon: '50',
      title: 'Money Scholar',
      detail: 'Complete 50 lessons.',
      difficulty: 'Expert',
      reward: 2500,
      unlocked: completedLessons.length >= 50,
      progress: Math.min(completedLessons.length, 50),
      target: 50,
    },
    {
      id: 'hundred-lessons',
      icon: '100',
      title: 'Course Master',
      detail: 'Complete all 100 lessons.',
      difficulty: 'Legendary',
      reward: 7500,
      unlocked: completedLessons.length >= 100,
      progress: Math.min(completedLessons.length, 100),
      target: 100,
    },
    {
      id: 'xp-100',
      icon: 'XP',
      title: 'Level Up',
      detail: 'Earn 100 XP.',
      difficulty: 'Hard',
      reward: 400,
      unlocked: xp >= 100,
      progress: Math.min(xp, 100),
      target: 100,
    },
    {
      id: 'xp-500',
      icon: '500',
      title: 'XP Machine',
      detail: 'Earn 500 XP.',
      difficulty: 'Expert',
      reward: 2000,
      unlocked: xp >= 500,
      progress: Math.min(xp, 500),
      target: 500,
    },
    {
      id: 'xp-1000',
      icon: '1K',
      title: 'XP Champion',
      detail: 'Earn 1,000 XP.',
      difficulty: 'Legendary',
      reward: 5000,
      unlocked: xp >= 1000,
      progress: Math.min(xp, 1000),
      target: 1000,
    },
    {
      id: 'cash-100',
      icon: '$',
      title: 'Cash Builder',
      detail: 'Reach $100 in practice cash.',
      difficulty: 'Medium',
      reward: 300,
      unlocked: wallet >= 100,
      progress: Math.min(wallet, 100),
      target: 100,
    },
    {
      id: 'cash-5000',
      icon: '$$',
      title: 'Practice Tycoon',
      detail: 'Reach $5,000 in practice cash.',
      difficulty: 'Legendary',
      reward: 5000,
      unlocked: wallet >= 5000,
      progress: Math.min(wallet, 5000),
      target: 5000,
    },
    {
      id: 'quiz-correct',
      icon: '?',
      title: 'Fact Checker',
      detail: 'Answer the quick check correctly.',
      difficulty: 'Easy',
      reward: 75,
      unlocked: answer === 'facts',
      progress: answer === 'facts' ? 1 : 0,
      target: 1,
    },
    {
      id: 'backpack',
      icon: '+',
      title: 'Packed Up',
      detail: 'Own any shop item.',
      difficulty: 'Medium',
      reward: 150,
      unlocked: ownedHints + ownedSkips + ownedRampages > 0,
      progress: Math.min(ownedHints + ownedSkips + ownedRampages, 1),
      target: 1,
    },
    {
      id: 'style',
      icon: '*',
      title: 'Style Switcher',
      detail: 'Change your cursor or background from the default.',
      difficulty: 'Easy',
      reward: 50,
      unlocked: theme !== 'fresh' || cursorDesign !== 'arrow' || cursorColor !== 'green',
      progress: theme !== 'fresh' || cursorDesign !== 'arrow' || cursorColor !== 'green' ? 1 : 0,
      target: 1,
    },
    {
      id: 'secret-dark-forest',
      icon: 'DF',
      title: 'Dark Forest',
      detail: 'You found the forest after sunset.',
      hint: 'A familiar green place can turn dark.',
      difficulty: 'Secret',
      reward: 900,
      secret: true,
      unlocked: theme === 'forest',
      progress: theme === 'forest' ? 1 : 0,
      target: 1,
    },
    {
      id: 'secret-full-boost',
      icon: 'MAX',
      title: 'Maximum Boost',
      detail: 'You activated every market booster in one round.',
      hint: 'The market has more power when every switch is on.',
      difficulty: 'Secret',
      reward: 2500,
      secret: true,
      unlocked: activeMarketBoosters.length === marketBoosters.length,
      progress: Math.min(activeMarketBoosters.length, marketBoosters.length),
      target: marketBoosters.length,
    },
    {
      id: 'secret-custom-look',
      icon: 'ART',
      title: 'Full Makeover',
      detail: 'You changed the theme, cursor shape, and cursor color.',
      hint: 'Change more than one part of the look.',
      difficulty: 'Secret',
      reward: 1200,
      secret: true,
      unlocked: theme !== 'fresh' && cursorDesign !== 'arrow' && cursorColor !== 'green',
      progress: [theme !== 'fresh', cursorDesign !== 'arrow', cursorColor !== 'green'].filter(Boolean).length,
      target: 3,
    },
    {
      id: 'secret-backpack-stack',
      icon: 'BAG',
      title: 'Loaded Backpack',
      detail: 'You stocked up with 5 total shop items.',
      hint: 'A heavy backpack can be useful.',
      difficulty: 'Secret',
      reward: 1500,
      secret: true,
      unlocked: ownedHints + ownedSkips + ownedRampages >= 5,
      progress: Math.min(ownedHints + ownedSkips + ownedRampages, 5),
      target: 5,
    },
    {
      id: 'secret-rich',
      icon: '10K',
      title: 'Hidden Fortune',
      detail: 'You reached $10,000 in practice cash.',
      hint: 'There is another money mountain above the visible one.',
      difficulty: 'Secret',
      reward: 10000,
      secret: true,
      unlocked: wallet >= 10000,
      progress: Math.min(wallet, 10000),
      target: 10000,
    },
  ];
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;
  const achievementProgress = Math.round((unlockedAchievements / achievements.length) * 100);
  useEffect(() => {
    if (!levelNotice) {
      return;
    }

    const timeout = window.setTimeout(() => setLevelNotice(null), 3200);

    return () => window.clearTimeout(timeout);
  }, [levelNotice]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setProgressLoaded(!data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProgressLoaded(!nextSession);
      setSaveStatus(nextSession ? 'Loading saved progress...' : 'Sign in to save progress.');
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      if (byeTimerRef.current) {
        window.clearTimeout(byeTimerRef.current);
      }
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      if (planetSpinTimerRef.current) {
        window.clearTimeout(planetSpinTimerRef.current);
      }
      if (wrongAnswerTimerRef.current) {
        window.clearTimeout(wrongAnswerTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!aiAnswer) {
      setDisplayedAiAnswer('');
      return;
    }

    setDisplayedAiAnswer('');

    let index = 0;
    const typeTimer = window.setInterval(() => {
      index += 2;
      setDisplayedAiAnswer(aiAnswer.slice(0, index));

      if (index >= aiAnswer.length) {
        window.clearInterval(typeTimer);
      }
    }, 18);

    return () => {
      window.clearInterval(typeTimer);
    };
  }, [aiAnswer]);

  useEffect(() => {
    const loadProgress = async () => {
      if (!session) {
        return;
      }

      setProgressLoaded(false);
      setSaveStatus('Loading saved progress...');
      const { data, error } = await supabase
        .from('user_progress')
        .select('progress')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        setSaveStatus(`Could not load progress: ${error.message}`);
        setProgressLoaded(true);
        return;
      }

      const progressData = data?.progress as Partial<SavedProgress> | null | undefined;

      if (progressData) {
        const savedDifficulty = progressData.lessonDifficulty ?? 'Easy';
        const savedBounds = getDifficultyBounds(savedDifficulty);
        const savedLessonId = progressData.activeLessonId ?? lessons[savedBounds.start]?.id ?? lessons[0].id;
        const savedLessonIndex = lessons.findIndex((lesson) => lesson.id === savedLessonId);
        const savedLessonIsInDifficulty =
          savedLessonIndex >= savedBounds.start && savedLessonIndex <= savedBounds.end;
        const nextLessonIndex = savedLessonIsInDifficulty ? savedLessonIndex : savedBounds.start;

        setActiveLessonId(lessons[nextLessonIndex]?.id ?? lessons[0].id);
        setLessonWindowStart(nextLessonIndex);
        setClaimedAchievements(progressData.claimedAchievements ?? []);
        setCompletedLessons(progressData.completedLessons ?? []);
        setOwnedHints(progressData.ownedHints ?? 0);
        setOwnedRampages(progressData.ownedRampages ?? 0);
        setOwnedSkips(progressData.ownedSkips ?? 0);
        setOwnedBoosters({
          ...getEmptyBoosters(),
          ...(progressData.ownedBoosters ?? {}),
        });
        setSkippedQuestions(progressData.skippedQuestions ?? []);
        setTheme(progressData.theme ?? 'fresh');
        setChartMode(progressData.chartMode ?? 'line');
        setLessonDifficulty(savedDifficulty);
        setLessonDifficultyChosen(progressData.lessonDifficultyChosen ?? false);
        setCurrency(progressData.currency ?? 'USD');
        setLanguage(progressData.language ?? 'en');
        setCursorDesign(progressData.cursorDesign ?? 'arrow');
        setCursorColor(progressData.cursorColor ?? 'green');
        setWallet(progressData.wallet ?? 0);
        setRealPiggyBank(progressData.realPiggyBank ?? 0);
        setXp(progressData.xp ?? 0);
      }

      setProgressLoaded(true);
      setSaveStatus(progressData ? 'Saved progress loaded.' : 'New account ready to save.');
    };

    loadProgress();
  }, [session]);

  useEffect(() => {
    if (!session || !progressLoaded) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setSaveStatus('Saving progress...');
    saveTimerRef.current = window.setTimeout(async () => {
      const progressData: SavedProgress = {
        activeLessonId,
        chartMode,
        claimedAchievements,
        completedLessons,
        currency,
        cursorColor,
        cursorDesign,
        language,
        lessonDifficulty,
        lessonDifficultyChosen,
        ownedBoosters,
        ownedHints,
        ownedRampages,
        ownedSkips,
        realPiggyBank,
        skippedQuestions,
        theme,
        wallet,
        xp,
      };

      const { error } = await supabase.from('user_progress').upsert({
        user_id: session.user.id,
        progress: progressData,
        updated_at: new Date().toISOString(),
      });

      setSaveStatus(error ? `Could not save: ${error.message}` : 'Progress saved.');
      saveTimerRef.current = null;
    }, 700);
  }, [
    activeLessonId,
    chartMode,
    claimedAchievements,
    completedLessons,
    currency,
    cursorColor,
    cursorDesign,
    language,
    lessonDifficulty,
    lessonDifficultyChosen,
    ownedBoosters,
    ownedHints,
    ownedRampages,
    ownedSkips,
    progressLoaded,
    realPiggyBank,
    session,
    skippedQuestions,
    theme,
    wallet,
    xp,
  ]);

  useEffect(() => {
    if (musicTimerRef.current) {
      window.clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }

    if (!musicPlaying) {
      return;
    }

    const browserWindow = window as BrowserWindowWithAudio;
    const AudioContext = browserWindow.AudioContext || browserWindow.webkitAudioContext;

    if (!AudioContext) {
      setMusicPlaying(false);
      return;
    }

    const audio = musicContextRef.current ?? new AudioContext();
    musicContextRef.current = audio;

    if (audio.state === 'suspended') {
      audio.resume();
    }

    let step = 0;
    const beatMs = Math.round(60000 / activeMusicTrack.bpm);

    const playStep = () => {
      const note = activeMusicTrack.song[step % activeMusicTrack.song.length];
      const noteLength = beatMs / 1000;
      const playPianoTone = (frequency: number, volumeScale: number, lengthScale = 1) => {
        const tone = audio.createOscillator();
        const shimmer = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime;
        const length = noteLength * lengthScale;

        tone.type = 'triangle';
        shimmer.type = 'sine';
        tone.frequency.setValueAtTime(frequency, start);
        shimmer.frequency.setValueAtTime(frequency * 2.01, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime((musicVolume / 1000) * volumeScale, start + 0.012);
        gain.gain.exponentialRampToValueAtTime((musicVolume / 2600) * volumeScale, start + length * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
        tone.connect(gain);
        shimmer.connect(gain);
        gain.connect(audio.destination);
        tone.start(start);
        shimmer.start(start);
        tone.stop(start + length + 0.02);
        shimmer.stop(start + length + 0.02);
      };

      if (note) {
        activeMusicTrack.chord.forEach((ratio, index) => {
          playPianoTone(note * ratio, index === 0 ? 0.9 : 0.28, 0.9);
        });
      }

      if (step % 4 === 0) {
        const measure = Math.floor(step / 4);
        const bassNote =
          activeMusicTrack.bassLine[measure % activeMusicTrack.bassLine.length];

        playPianoTone(bassNote, 0.55, 2.8);
      }

      step += 1;
    };

    playStep();
    musicTimerRef.current = window.setInterval(playStep, beatMs);

    return () => {
      if (musicTimerRef.current) {
        window.clearInterval(musicTimerRef.current);
        musicTimerRef.current = null;
      }
    };
  }, [activeMusicTrack, musicPlaying, musicVolume]);

  const openLesson = (lessonId: string) => {
    const lessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
    const previousLesson =
      lessonIndex > difficultyBounds.start ? lessons[lessonIndex - 1] : undefined;

    if (previousLesson && !completedLessons.includes(previousLesson.id)) {
      setLockedMessage(`Complete lesson ${lessonIndex} first to unlock this level.`);
      return;
    }

    setLockedMessage('');
    setLessonWindowStart(lessonIndex);
    setActiveLessonId(lessonId);
    setQuestionIndex(0);
    setLessonAnswer('');
    setLessonHint('');
    setHelperMessage('');
    setLessonMistakes([]);
    setReviewComplete(false);
    setPage('lesson');
    setActiveSection('lessons');
  };

  const goToCourse = () => {
    setPage('course');
    setLessonAnswer('');
    setLessonHint('');
    setHelperMessage('');
    setReviewComplete(false);
    setActiveSection('lessons');
  };

  const activateSection = (sectionId: SectionId) => {
    if (activeSection === 'shop' && sectionId !== 'shop') {
      if (byeTimerRef.current) {
        window.clearTimeout(byeTimerRef.current);
      }

      setShowByeSign(true);
      byeTimerRef.current = window.setTimeout(() => {
        setShowByeSign(false);
        setActiveSection(sectionId);
        byeTimerRef.current = null;
      }, 2000);
      return;
    }

    if (byeTimerRef.current) {
      window.clearTimeout(byeTimerRef.current);
      byeTimerRef.current = null;
    }

    setShowByeSign(false);
    setActiveSection(sectionId);
  };

  const changeXp = (amount: number) => {
    setXp((current) => {
      const nextXp = Math.max(0, current + amount);
      const currentLevel = Math.floor(current / 100) + 1;
      const nextLevel = Math.floor(nextXp / 100) + 1;

      if (nextLevel > currentLevel) {
        setLevelNotice(nextLevel);
      }

      return nextXp;
    });
  };

  const spinToLesson = (nextIndex: number) => {
    if (planetSpinTimerRef.current) {
      window.clearTimeout(planetSpinTimerRef.current);
    }

    setPlanetSpinning(true);
    planetSpinTimerRef.current = window.setTimeout(() => {
      const boundedIndex = Math.min(
        Math.max(nextIndex, difficultyBounds.start),
        difficultyBounds.end,
      );
      setLessonWindowStart(boundedIndex);
      setActiveLessonId(lessons[boundedIndex]?.id ?? lessons[0].id);
      setQuestionIndex(0);
      setLessonAnswer('');
      setLessonHint('');
      setHelperMessage('');
      setLessonMistakes([]);
      setReviewComplete(false);
      setPlanetSpinning(false);
      planetSpinTimerRef.current = null;
    }, 850);
  };

  const chooseLessonDifficulty = (difficulty: LessonDifficulty) => {
    const nextBounds = getDifficultyBounds(difficulty);

    setLessonDifficulty(difficulty);
    setLessonDifficultyChosen(true);
    setLockedMessage('');
    setLessonWindowStart(nextBounds.start);
    setActiveLessonId(lessons[nextBounds.start]?.id ?? lessons[0].id);
    setPlanetSpinning(true);

    if (planetSpinTimerRef.current) {
      window.clearTimeout(planetSpinTimerRef.current);
    }

    planetSpinTimerRef.current = window.setTimeout(() => {
      setQuestionIndex(0);
      setLessonAnswer('');
      setLessonHint('');
      setHelperMessage('');
      setLessonMistakes([]);
      setReviewComplete(false);
      setPlanetSpinning(false);
      planetSpinTimerRef.current = null;
    }, 850);
  };

  const answerLessonQuestion = (choice: string) => {
    const isCorrectChoice = choice === activeQuestion.correct;
    const alreadyAnsweredCorrectly = lessonAnswer === activeQuestion.correct;

    if (lessonAnswer || alreadyAnsweredCorrectly) {
      return;
    }

    playAnswerSound(isCorrectChoice);

    if (!isCorrectChoice) {
      setLessonAnswer(choice);
      setLessonMistakes((current) => {
        const mistake = {
          questionIndex,
          question: activeQuestion.question,
          picked: choice,
          correct: activeQuestion.correct,
        };
        const alreadySaved = current.some((item) => item.questionIndex === questionIndex);

        return alreadySaved
          ? current.map((item) => (item.questionIndex === questionIndex ? mistake : item))
          : [...current, mistake];
      });

      if (wrongAnswerTimerRef.current) {
        window.clearTimeout(wrongAnswerTimerRef.current);
      }

      wrongAnswerTimerRef.current = window.setTimeout(() => {
        if (isFinalQuestion) {
          setLessonAnswer(activeQuestion.correct);
          setCompletedLessons((current) =>
            current.includes(activeLesson.id) ? current : [...current, activeLesson.id],
          );
          if (activeLessonIndex < difficultyBounds.end) {
            window.setTimeout(() => spinToLesson(activeLessonIndex + 1), 1000);
          }
        } else {
          setQuestionIndex((current) => current + 1);
          setLessonAnswer('');
          setLessonHint('');
          setHelperMessage('');
          setReviewComplete(false);
        }

        wrongAnswerTimerRef.current = null;
      }, 900);
      return;
    }

    setLessonAnswer(choice);

    if (isCorrectChoice && !alreadyAnsweredCorrectly && !wasSkipped) {
      changeXp(10);
    }

    if (isCorrectChoice && isFinalQuestion) {
      setCompletedLessons((current) =>
        current.includes(activeLesson.id) ? current : [...current, activeLesson.id],
      );
      if (activeLessonIndex < difficultyBounds.end) {
        window.setTimeout(() => spinToLesson(activeLessonIndex + 1), 1000);
      }
    }
  };

  const buyShopItem = (item: 'hint' | 'skip' | 'rampage' | MarketBoosterId) => {
    const booster = marketBoosters.find((marketBooster) => marketBooster.id === item);
    const cost = booster
      ? booster.cost
      : item === 'hint'
        ? hintCost
        : item === 'skip'
          ? skipCost
          : skipRampageCost;

    if (wallet < cost) {
      setShopMessage(`Need $${cost - wallet} more for that ${booster?.label ?? item}.`);
      playAnswerSound(false);
      return;
    }

    setWallet((current) => current - cost);
    if (booster) {
      setOwnedBoosters((current) => ({
        ...current,
        [booster.id]: current[booster.id] + 1,
      }));
      setShopMessage(`${booster.label} booster added to your backpack.`);
    } else if (item === 'hint') {
      setOwnedHints((current) => current + 1);
      setShopMessage('Hint ticket added to your backpack.');
    } else if (item === 'skip') {
      setOwnedSkips((current) => current + 1);
      setShopMessage('Skip pass added to your backpack.');
    } else {
      setOwnedRampages((current) => current + 1);
      setShopMessage('Skip Rampage added to your backpack.');
    }
    playAnswerSound(true);
  };

  const useHint = () => {
    if (ownedHints < 1 || lessonHint || lessonAnswer) {
      return;
    }

    const hintBank = [
      'Think about which answer is careful instead of extreme.',
      'Look for the choice that admits investing can have risk.',
      'Ignore answers that promise something always happens.',
      'Pick the answer that uses facts before feelings.',
      'Watch out for words like always, never, guaranteed, or instant.',
      'Choose the option that would still make sense over many years.',
    ];
    const clue = hintBank[(activeLessonIndex + questionIndex) % hintBank.length];

    setOwnedHints((current) => Math.max(0, current - 1));
    setLessonHint(`Hint: ${clue}`);
    setHelperMessage('Hint ticket used.');
    playAnswerSound(true);
  };

  const useSkip = () => {
    if (ownedSkips < 1 || lessonAnswer) {
      return;
    }

    setOwnedSkips((current) => Math.max(0, current - 1));
    setSkippedQuestions((current) =>
      current.includes(activeQuestionKey) ? current : [...current, activeQuestionKey],
    );
    setLessonHint('');
    setHelperMessage('');
    playAnswerSound(true);

    if (isFinalQuestion) {
      setLessonAnswer(activeQuestion.correct);
      setHelperMessage('Skip pass used. Lesson complete.');
      setCompletedLessons((current) =>
        current.includes(activeLesson.id) ? current : [...current, activeLesson.id],
      );
      if (activeLessonIndex < difficultyBounds.end) {
        window.setTimeout(() => spinToLesson(activeLessonIndex + 1), 1000);
      }
      return;
    }

    setQuestionIndex((current) => current + 1);
    setLessonAnswer('');
    setReviewComplete(false);
  };

  const useSkipRampage = () => {
    if (ownedRampages < 1) {
      return;
    }

    const lessonStartIndex = Math.min(Math.max(activeLessonIndex, difficultyBounds.start), difficultyBounds.end);
    const rampageEndIndex = Math.min(lessonStartIndex + 10, difficultyBounds.end + 1);
    const rampageLessons = lessons
      .slice(lessonStartIndex, rampageEndIndex)
      .map((lesson) => lesson.id);
    const nextLessonIndex = Math.min(lessonStartIndex + 10, difficultyBounds.end);
    const nextLesson = lessons[nextLessonIndex];

    setOwnedRampages((current) => Math.max(0, current - 1));
    setCompletedLessons((current) => Array.from(new Set([...current, ...rampageLessons])));
    setLessonAnswer('');
    setLessonHint('');
    setHelperMessage(`Skip Rampage used. ${rampageLessons.length} lessons completed.`);
    setLessonMistakes([]);
    setReviewComplete(false);
    setQuestionIndex(0);
    playAnswerSound(true);

    if (nextLesson && nextLessonIndex > lessonStartIndex) {
      spinToLesson(nextLessonIndex);
      return;
    }

    goToCourse();
  };

  const openNextLesson = () => {
    if (activeLessonIndex < difficultyBounds.end) {
      spinToLesson(activeLessonIndex + 1);
      return;
    }

    goToCourse();
  };

  const startLearning = () => {
    setPage('course');
    activateSection('lessons');
  };

  const openAccountMode = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthMessage('');
    setPage('course');
    activateSection('account');
  };

  const growth = useMemo(() => {
    const monthlyRate = 0.06 / 12;
    const months = years * 12;
    let total = startMoney;

    for (let month = 0; month < months; month += 1) {
      total = total * (1 + monthlyRate) + monthlyMoney;
    }

    return Math.round(total);
  }, [monthlyMoney, startMoney, years]);

  const quizMessage =
    answer === 'facts'
      ? 'Correct. First learn what happened, then decide.'
      : answer
        ? 'Not quite. Price drops can mean different things, so facts come first.'
        : '';
  const boostedTradeShares = tradeRound.shares + (activeMarketBoosters.includes('extra-shares') ? 5 : 0);
  const visibleTradePoints = tradeResult ? tradeRound.points : tradeRound.points.slice(0, 3);
  const visibleTradeLine = visibleTradePoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join('');
  const lastVisibleTradePoint = visibleTradePoints[visibleTradePoints.length - 1];
  const visibleTradeArea = `${visibleTradeLine}L${lastVisibleTradePoint?.x ?? 35} 184L35 184Z`;
  const visibleTradeSegments = visibleTradePoints.slice(1).map((point, index) => {
    const previousPoint = visibleTradePoints[index];
    const direction = point.price >= previousPoint.price ? 'up' : 'down';

    return {
      direction,
      d: `M${previousPoint.x} ${previousPoint.y}L${point.x} ${point.y}`,
      key: `${previousPoint.x}-${point.x}`,
      point,
      previousPoint,
    };
  });
  const visibleTradeCandles = visibleTradeSegments.map((segment) => {
    const top = Math.min(segment.previousPoint.y, segment.point.y);
    const bottom = Math.max(segment.previousPoint.y, segment.point.y);
    const height = Math.max(8, bottom - top);

    return {
      ...segment,
      bodyHeight: height,
      bodyY: top,
      x: segment.point.x - 9,
    };
  });

  const activateMarketBooster = (boosterId: MarketBoosterId) => {
    const booster = marketBoosters.find((item) => item.id === boosterId);

    if (!booster || tradeResult || activeMarketBoosters.includes(boosterId)) {
      return;
    }

    if (ownedBoosters[boosterId] < 1) {
      playAnswerSound(false);
      return;
    }

    setOwnedBoosters((current) => ({
      ...current,
      [boosterId]: Math.max(0, current[boosterId] - 1),
    }));
    setActiveMarketBoosters((current) => [...current, boosterId]);
    playAnswerSound(true);
  };

  const makeTrade = (choice: 'buy' | 'sell' | 'hold') => {
    const priceMove = tradeRound.endPrice - tradeRound.startPrice;
    const baseMoney =
      choice === 'buy'
        ? priceMove * boostedTradeShares
        : choice === 'sell'
          ? -priceMove * boostedTradeShares
          : 0;
    const doubledMoney = activeMarketBoosters.includes('double') ? baseMoney * 2 : baseMoney;
    const protectedMoney =
      activeMarketBoosters.includes('shield') && doubledMoney < 0 ? 0 : doubledMoney;
    const roundedMoney = Math.round(protectedMoney);
    const boosterNames = activeMarketBoosters
      .map((boosterId) => marketBoosters.find((item) => item.id === boosterId)?.label)
      .filter(Boolean)
      .join(', ');
    const boosterNote = boosterNames ? ` Boosters used: ${boosterNames}.` : '';

    setTradeChoice(choice);
    setWallet((current) => Math.max(0, current + roundedMoney));
    playAnswerSound(roundedMoney >= 0);
    setTradeResult({
      money: roundedMoney,
      message:
        choice === 'hold'
          ? `You stayed out. Sometimes no trade is a smart trade, but this round gives $0.${boosterNote}`
          : roundedMoney > 0
            ? `Nice timing. Your pretend trade made $${roundedMoney}.${boosterNote}`
            : roundedMoney < 0
              ? `That trade lost $${Math.abs(roundedMoney)} from your cash wallet.${boosterNote}`
              : activeMarketBoosters.includes('shield') && doubledMoney < 0
                ? `Shield protected you from a losing trade.${boosterNote}`
                : `Break-even trade. No money gained or lost.${boosterNote}`,
    });
  };

  const resetTrade = () => {
    setTradeRound(makeTradeRound());
    setTradeChoice('');
    setTradeResult(null);
    setActiveMarketBoosters([]);
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage('');

    const { error } =
      authMode === 'signup'
        ? await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
          })
        : await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
          });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage(
        authMode === 'signup'
          ? 'Account created. Check your email if confirmation is required.'
          : 'Signed in. Loading your progress.',
      );
      setAuthPassword('');
    }

    setAuthBusy(false);
  };

  const signInWithGoogle = async () => {
    setAuthBusy(true);
    setAuthMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setAuthMessage(error.message);
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthMessage('Signed out. Local progress stays on this device.');
  };

  const claimAchievementReward = (achievementId: string, reward: number, unlocked: boolean) => {
    if (!unlocked || claimedAchievements.includes(achievementId)) {
      return;
    }

    setClaimedAchievements((current) =>
      current.includes(achievementId) ? current : [...current, achievementId],
    );
    setWallet((current) => current + reward);
    playAnswerSound(true);
  };

  const changeRealPiggyBank = (amount: number) => {
    if (!Number.isFinite(amount) || amount === 0) {
      return;
    }

    setRealPiggyBank((current) => {
      const next = Number(Math.max(0, current + amount).toFixed(2));
      const addedSecretAmount = amount > 0 && Math.abs(amount - 123) < 0.005;
      const reachedSecretBalance = amount > 0 && current < 123 && next >= 123;

      if (addedSecretAmount || reachedSecretBalance) {
        window.setTimeout(() => {
          setActiveSection('secret-game');
          setSecretGameMessage('Games are free. Pick anything and play.');
          playAnswerSound(true);
        }, 0);
      }

      return next;
    });
  };

  const addCustomRealMoney = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    changeRealPiggyBank(Number(realPiggyAmount));
    setRealPiggyAmount('1');
  };

  const playSecretGameTile = (tileIndex: number) => {
    const isSafeTile = tileIndex === secretGameTarget;

    if (isSafeTile) {
      setSecretGameScore((current) => current + 1);
      setWallet((current) => current + 123);
      setSecretGameMessage('Safe tile. You earned $123 game cash.');
      playAnswerSound(true);
    } else {
      setSecretGameMessage('Locked tile. The vault moved the safe spot.');
      playAnswerSound(false);
    }

    setSecretGameTarget(Math.floor(Math.random() * 9));
  };

  const playVaultCode = (code: string) => {
    if (code === vaultCodeTarget) {
      setSecretGameScore((current) => current + 1);
      setWallet((current) => current + 75);
      setSecretGameMessage(`Code ${code} opened a bonus drawer. You earned $75 game cash.`);
      playAnswerSound(true);
    } else {
      setSecretGameMessage(`Code ${code} was close, but the vault wanted ${vaultCodeTarget}.`);
      playAnswerSound(false);
    }

    setVaultCodeTarget(['123', '231', '312'][Math.floor(Math.random() * 3)]);
  };

  const playMarketGuess = (guess: 'up' | 'down') => {
    if (guess === marketDirection) {
      setSecretGameScore((current) => current + 1);
      setWallet((current) => current + 50);
      setSecretGameMessage(`Correct. The mini market went ${marketDirection}. You earned $50 game cash.`);
      playAnswerSound(true);
    } else {
      setSecretGameMessage(`Not this time. The mini market went ${marketDirection}.`);
      playAnswerSound(false);
    }

    setMarketDirection(Math.random() > 0.5 ? 'up' : 'down');
  };

  const resetSnakeGame = () => {
    const freshSnake = [
      { x: 4, y: 5 },
      { x: 3, y: 5 },
      { x: 2, y: 5 },
    ];

    setSnake(freshSnake);
    setSnakeFood(makeSnakeFood(freshSnake));
    setSnakeDirection({ x: 1, y: 0 });
    setSnakeScore(0);
    setSnakeRunning(true);
    setSecretGameMessage('Snake started. Eat coins and avoid the walls.');
  };

  const changeSnakeDirection = (direction: SnakeCell) => {
    setSnakeDirection((current) =>
      current.x + direction.x === 0 && current.y + direction.y === 0 ? current : direction,
    );
    setSnakeRunning(true);
  };

  const resetBreakerGame = () => {
    setBreakerPaddle(42);
    setBreakerBall({ x: 50, y: 74, dx: 3, dy: -3 });
    setBreakerBricks(getFreshBricks());
    setBreakerScore(0);
    setBreakerRunning(true);
    setSecretGameMessage('Block Breaker started. Clear the money blocks.');
  };

  const moveBreakerPaddle = (amount: number) => {
    setBreakerPaddle((current) => Math.min(84, Math.max(0, current + amount)));
    setBreakerRunning(true);
  };

  useEffect(() => {
    if (activeVaultGame !== 'snake' || !snakeRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setSnake((currentSnake) => {
        const head = currentSnake[0];
        const nextHead = {
          x: head.x + snakeDirection.x,
          y: head.y + snakeDirection.y,
        };
        const hitWall =
          nextHead.x < 0 ||
          nextHead.y < 0 ||
          nextHead.x >= snakeBoardSize ||
          nextHead.y >= snakeBoardSize;
        const hitSelf = currentSnake.some((cell) => cell.x === nextHead.x && cell.y === nextHead.y);

        if (hitWall || hitSelf) {
          setSnakeRunning(false);
          setSecretGameMessage('Snake crashed. Start again for another run.');
          playAnswerSound(false);
          return currentSnake;
        }

        const ateFood = nextHead.x === snakeFood.x && nextHead.y === snakeFood.y;
        const nextSnake = [nextHead, ...currentSnake];

        if (!ateFood) {
          nextSnake.pop();
          return nextSnake;
        }

        setSnakeScore((current) => current + 1);
        setWallet((current) => current + 10);
        setSecretGameScore((current) => current + 1);
        setSecretGameMessage('Snake ate a coin. +$10 game cash.');
        setSnakeFood(makeSnakeFood(nextSnake));
        playAnswerSound(true);
        return nextSnake;
      });
    }, 220);

    return () => window.clearInterval(timer);
  }, [activeVaultGame, snakeDirection, snakeFood, snakeRunning]);

  useEffect(() => {
    if (activeVaultGame !== 'breaker' || !breakerRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setBreakerBall((currentBall) => {
        let nextBall = {
          ...currentBall,
          x: currentBall.x + currentBall.dx,
          y: currentBall.y + currentBall.dy,
        };

        if (nextBall.x <= 2 || nextBall.x >= 98) {
          nextBall = { ...nextBall, dx: -nextBall.dx };
        }

        if (nextBall.y <= 4) {
          nextBall = { ...nextBall, dy: Math.abs(nextBall.dy) };
        }

        const hitPaddle = nextBall.y >= 86 && nextBall.x >= breakerPaddle && nextBall.x <= breakerPaddle + 16;
        if (hitPaddle) {
          nextBall = { ...nextBall, dy: -Math.abs(nextBall.dy) };
        }

        if (nextBall.y > 100) {
          setBreakerRunning(false);
          setSecretGameMessage('The ball dropped. Try Block Breaker again.');
          playAnswerSound(false);
          return { x: 50, y: 74, dx: 3, dy: -3 };
        }

        const hitBrick = breakerBricks.find((brick) => {
          const column = brick % 6;
          const row = Math.floor(brick / 6);
          const brickX = 5 + column * 15;
          const brickY = 10 + row * 10;
          return nextBall.x >= brickX && nextBall.x <= brickX + 11 && nextBall.y >= brickY && nextBall.y <= brickY + 6;
        });

        if (hitBrick !== undefined) {
          setBreakerBricks((current) => current.filter((brick) => brick !== hitBrick));
          setBreakerScore((current) => current + 1);
          setWallet((current) => current + 8);
          setSecretGameScore((current) => current + 1);
          setSecretGameMessage('Block cleared. +$8 game cash.');
          playAnswerSound(true);
          nextBall = { ...nextBall, dy: -nextBall.dy };
        }

        return nextBall;
      });
    }, 42);

    return () => window.clearInterval(timer);
  }, [activeVaultGame, breakerBricks, breakerPaddle, breakerRunning]);

  useEffect(() => {
    const handleVaultKeys = (event: KeyboardEvent) => {
      if (activeVaultGame === 'snake') {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          changeSnakeDirection({ x: 0, y: -1 });
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          changeSnakeDirection({ x: 0, y: 1 });
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          changeSnakeDirection({ x: -1, y: 0 });
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          changeSnakeDirection({ x: 1, y: 0 });
        }
      }

      if (activeVaultGame === 'breaker') {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          moveBreakerPaddle(-8);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          moveBreakerPaddle(8);
        }
      }
    };

    window.addEventListener('keydown', handleVaultKeys);
    return () => window.removeEventListener('keydown', handleVaultKeys);
  }, [activeVaultGame, snakeDirection]);

  const askVerityForHelp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = aiPrompt.trim();

    if (!question) {
      setAiError('Type a question first.');
      return;
    }

    setAiBusy(true);
    setAiError('');
    setAiAnswer('');

    const activeLessonTitle = page === 'lesson' ? activeLesson.title : 'No lesson is open';
    const system = [
      'Your name is Pushy. You are a kid-friendly AI tutor inside an investing learning app.',
      'Explain money and investing ideas simply, kindly, and briefly.',
      'Never give real financial advice, stock picks, or promises about returns.',
      'Use examples a teen can understand and keep answers under 120 words.',
    ].join(' ');
    const prompt = `Current app section: ${activeSection}. Current lesson: ${activeLessonTitle}. Student question: ${question}`;

    try {
      const { data, error } = await supabase.functions.invoke('ai', {
        body: { prompt, system },
      });

      if (error) {
        throw error;
      }

      const text = typeof data?.text === 'string' ? data.text.trim() : '';

      if (!text) {
        throw new Error('Pushy did not send an answer.');
      }

      setAiAnswer(text);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Pushy is not available right now.');
    } finally {
      setAiBusy(false);
    }
  };

  const themePicker = (
    <div className="theme-picker" aria-label="Background settings">
      <span>Background</span>
      <div>
        {themes.map((themeOption) => (
          <button
            className={`theme-swatch theme-swatch--${themeOption.id} ${
              theme === themeOption.id ? 'theme-swatch--active' : ''
            }`}
            key={themeOption.id}
            onClick={() => setTheme(themeOption.id)}
            type="button"
          >
            {themeOption.label}
          </button>
        ))}
      </div>
    </div>
  );

  const musicSettings = (
    <div className="music-settings" aria-label="Music settings">
      <div>
        <span>Music</span>
        <strong>{activeMusicTrack.name}</strong>
      </div>
      <div className="music-track-list" role="group" aria-label="Choose music track">
        {musicTracks.map((musicTrack) => (
          <button
            className={`music-track ${selectedMusic === musicTrack.id ? 'music-track--active' : ''}`}
            key={musicTrack.id}
            type="button"
            onClick={() => setSelectedMusic(musicTrack.id)}
          >
            {musicTrack.name}
          </button>
        ))}
      </div>
      <div className="music-controls">
        <button
          className="ghost-button"
          type="button"
          onClick={() => setMusicPlaying((current) => !current)}
        >
          {musicPlaying ? 'Pause' : 'Play'}
        </button>
        <label>
          Volume
          <input
            max="100"
            min="0"
            type="range"
            value={musicVolume}
            onChange={(event) => setMusicVolume(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );

  const cursorSettings = (
    <div className="cursor-settings" aria-label="Cursor settings">
      <div>
        <span>Cursor</span>
        <strong>{`${cursorDesigns.find((option) => option.id === cursorDesign)?.label ?? 'Arrow'} / ${activeCursorColor.label}`}</strong>
      </div>
      <div className="cursor-design-list" role="group" aria-label="Choose cursor design">
        {cursorDesigns.map((designOption) => (
          <button
            className={`cursor-design cursor-design--${designOption.id} ${
              cursorDesign === designOption.id ? 'cursor-design--active' : ''
            }`}
            key={designOption.id}
            type="button"
            onClick={() => setCursorDesign(designOption.id)}
          >
            <span aria-hidden="true" />
            {designOption.label}
          </button>
        ))}
      </div>
      <div className="cursor-color-list" role="group" aria-label="Choose cursor color">
        {cursorColors.map((colorOption) => (
          <button
            aria-label={`${colorOption.label} cursor`}
            className={`cursor-color ${cursorColor === colorOption.id ? 'cursor-color--active' : ''}`}
            key={colorOption.id}
            style={{ '--cursor-color': colorOption.value } as CSSProperties}
            type="button"
            onClick={() => setCursorColor(colorOption.id)}
          >
            <span aria-hidden="true" />
            {colorOption.label}
          </button>
        ))}
      </div>
    </div>
  );

  const currencySettings = (
    <div className="currency-settings" aria-label="Currency settings">
      <div>
        <span>{t('settings.currency')}</span>
        <strong>{currencies.find((currencyOption) => currencyOption.id === currency)?.label}</strong>
      </div>
      <div className="currency-list" role="group" aria-label="Choose real money currency">
        {currencies.map((currencyOption) => (
          <button
            className={`currency-option ${currency === currencyOption.id ? 'currency-option--active' : ''}`}
            key={currencyOption.id}
            type="button"
            onClick={() => setCurrency(currencyOption.id)}
          >
            <strong>{currencyOption.id}</strong>
            <span>{currencyOption.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const languageSettings = (
    <div className="language-settings" aria-label="Language settings">
      <div>
        <span>{t('settings.language')}</span>
        <strong>{languages.find((languageOption) => languageOption.id === language)?.label}</strong>
      </div>
      <div className="language-list" role="group" aria-label="Choose language">
        {languages.map((languageOption) => (
          <button
            className={`language-option ${language === languageOption.id ? 'language-option--active' : ''}`}
            key={languageOption.id}
            type="button"
            onClick={() => setLanguage(languageOption.id)}
          >
            <strong>{languageOption.id.toUpperCase()}</strong>
            <span>{languageOption.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const chartSettings = (
    <div className="chart-settings" aria-label="Market chart settings">
      <div>
        <span>Market chart</span>
        <strong>{chartMode === 'line' ? 'Normal lines' : 'Candles'}</strong>
      </div>
      <div className="chart-mode-list" role="group" aria-label="Choose market chart style">
        {[
          { id: 'line', label: 'Normal lines' },
          { id: 'candles', label: 'Candles' },
        ].map((modeOption) => (
          <button
            className={`chart-mode-option ${chartMode === modeOption.id ? 'chart-mode-option--active' : ''}`}
            key={modeOption.id}
            type="button"
            onClick={() => setChartMode(modeOption.id as ChartMode)}
          >
            {modeOption.label}
          </button>
        ))}
      </div>
    </div>
  );

  const lessonDifficultySettings = (
    <div className="lesson-difficulty-settings" aria-label="Lesson difficulty settings">
      <div>
        <span>Lesson difficulty</span>
        <strong>{lessonDifficulty}</strong>
      </div>
      <div className="difficulty-choice-list" role="group" aria-label="Choose lesson difficulty">
        {lessonDifficultyOptions.map((difficulty) => {
          const optionBounds = getDifficultyBounds(difficulty);

          return (
            <button
              className={`difficulty-choice ${lessonDifficulty === difficulty ? 'difficulty-choice--active' : ''}`}
              key={difficulty}
              type="button"
              onClick={() => chooseLessonDifficulty(difficulty)}
            >
              <strong>{difficulty}</strong>
              <span>
                Levels {optionBounds.start + 1}-{optionBounds.end + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (page === 'lesson') {
    return (
      <main className={`app-shell theme-${theme} lesson-page custom-cursor`} style={cursorStyle}>
        {levelNotice && (
          <div className="level-toast" role="status">
            <strong>Level {levelNotice} unlocked</strong>
            <span>You reached a new learning level.</span>
          </div>
        )}
        <nav className="lesson-topbar" aria-label="Lesson navigation">
          <button className="ghost-button" type="button" onClick={goToCourse}>
            Back to map
          </button>
          <div className="lesson-stats">
            <span>Level {level}</span>
            <span>{xp} XP</span>
            <span>${wallet} cash</span>
            <span>{100 - xpIntoLevel} XP to next</span>
            <span>{completedLessons.length}/{lessons.length} complete</span>
          </div>
        </nav>

        <section className="lesson-stage">
          <div className="lesson-brief">
            <p className="eyebrow">Lesson {activeLesson.badge}</p>
            <h1>{activeLesson.title.replace(`${activeLesson.badge}. `, '')}</h1>
            <p>{activeLesson.text}</p>
            <span className="lesson-tip">{activeLesson.check}</span>
          </div>

          <article className="lesson-card-page">
            <div className="lesson-progress-header">
              <p className="question-meta">
                Question {questionIndex + 1} of {activeLesson.questions.length}
              </p>
              <div className="progress-track">
                <span style={{ width: `${lessonProgress}%` }} />
              </div>
            </div>

            <div className="question-tutor">
              <p className="question-prompt">{activeQuestion.question}</p>
            </div>
            <div className="lesson-tools" aria-label="Lesson item backpack">
              <div>
                <strong>{ownedHints}</strong>
                <span>Hints</span>
              </div>
              <div>
                <strong>{ownedSkips}</strong>
                <span>Skips</span>
              </div>
              <div>
                <strong>{ownedRampages}</strong>
                <span>Rampage</span>
              </div>
              <button
                className="ghost-button"
                disabled={ownedHints < 1 || Boolean(lessonHint) || Boolean(lessonAnswer)}
                type="button"
                onClick={useHint}
              >
                Use hint
              </button>
              <button
                className="ghost-button"
                disabled={ownedSkips < 1 || Boolean(lessonAnswer)}
                type="button"
                onClick={useSkip}
              >
                Use skip
              </button>
              <button
                className="ghost-button"
                disabled={ownedRampages < 1}
                type="button"
                onClick={useSkipRampage}
              >
                Use rampage
              </button>
            </div>
            {(lessonHint || helperMessage) && (
              <p className="helper-message">{lessonHint || helperMessage}</p>
            )}
            <h2>Choose the best answer</h2>
            <div className="choice-list">
              {activeQuestion.choices.map((choice) => {
                const isPicked = lessonAnswer === choice;
                const isCorrect = lessonAnswer && choice === activeQuestion.correct;
                const isWrong = isPicked && choice !== activeQuestion.correct;

                return (
                  <button
                    className={`choice ${isCorrect ? 'choice--correct' : ''} ${
                      isWrong ? 'choice--wrong' : ''
                    }`}
                    key={choice}
                    onClick={() => answerLessonQuestion(choice)}
                    type="button"
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {lessonAnswer && (
              <p className="lesson-feedback">
                {lessonAnswer === activeQuestion.correct
                  ? isFinalQuestion
                    ? wasSkipped
                      ? 'Lesson complete. Skip pass used.'
                      : 'Lesson complete. You earned XP.'
                    : wasSkipped
                      ? 'Skipped. Keep going.'
                      : 'Correct. Ready for the next challenge.'
                  : 'Not quite. Think about risk, facts, and time.'}
              </p>
            )}

            {lessonAnswer === activeQuestion.correct && !isFinalQuestion && (
              <button
                className="next-question"
                type="button"
                onClick={() => {
                  setQuestionIndex((current) => current + 1);
                  setLessonAnswer('');
                  setLessonHint('');
                  setHelperMessage('');
                  setReviewComplete(false);
                }}
              >
                Next question
              </button>
            )}

            {lessonAnswer === activeQuestion.correct && isFinalQuestion && lessonMistakes.length > 0 && !reviewComplete && (
              <div className="review-panel">
                <p className="eyebrow">Review time</p>
                <h3>Questions to practice again</h3>
                <p>
                  You finished the level. Check the questions you missed before moving on.
                </p>
                <div className="review-list">
                  {lessonMistakes.map((mistake) => (
                    <article className="review-item" key={`${mistake.questionIndex}-${mistake.picked}`}>
                      <strong>
                        Question {mistake.questionIndex + 1}: {mistake.question}
                      </strong>
                      <span>Your answer: {mistake.picked}</span>
                      <span>Correct answer: {mistake.correct}</span>
                    </article>
                  ))}
                </div>
                <button type="button" onClick={() => setReviewComplete(true)}>
                  I reviewed them
                </button>
              </div>
            )}

            {lessonAnswer === activeQuestion.correct && isFinalQuestion && (lessonMistakes.length === 0 || reviewComplete) && (
              <div className="finish-actions">
                <button type="button" onClick={goToCourse}>
                  Back to map
                </button>
                <button type="button" onClick={openNextLesson}>
                  {lessons[activeLessonIndex + 1] ? 'Next lesson' : 'Finish course'}
                </button>
              </div>
            )}
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell theme-${theme} custom-cursor`} style={cursorStyle}>
      {levelNotice && (
        <div className="level-toast" role="status">
          <strong>Level {levelNotice} unlocked</strong>
          <span>You reached a new learning level.</span>
        </div>
      )}
      <aside className="sidebar-nav" aria-label="App sidebar">
        <strong>Investing for Kids</strong>
        {sidebarItems.map((item) => (
          <button
            aria-label={t(`nav.${item.id}`)}
            className={activeSection === item.id ? 'quick-nav__active' : ''}
            key={item.id}
            title={t(`nav.${item.id}`)}
            type="button"
            onClick={() => activateSection(item.id)}
          >
            <span className="sidebar-nav__icon" aria-hidden="true">{item.icon}</span>
            <span className="sidebar-nav__label">{t(`nav.${item.id}`)}</span>
          </button>
        ))}
      </aside>
      <aside className="stats-sidebar" aria-label="Learning statistics">
        <div className="stats-sidebar__header">
          <p className="eyebrow">Statistics</p>
          <strong>Level {level}</strong>
        </div>
        <div className="stats-sidebar__meter" aria-label={`${xpIntoLevel} out of 100 XP toward next level`}>
          <div>
            <span>{xpIntoLevel}/100 XP</span>
            <span>{100 - xpIntoLevel} to next</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${xpIntoLevel}%` }} />
          </div>
        </div>
        <div className="stats-sidebar__grid">
          <span>
            <strong>{xp}</strong>
            XP earned
          </span>
          <span>
            <strong>${wallet}</strong>
            Cash
          </span>
          <span>
            <strong>{completedLessons.length}/{lessons.length}</strong>
            Lessons
          </span>
          <span>
            <strong>{totalQuestions}</strong>
            Questions
          </span>
        </div>
        <div className="stats-sidebar__mini">
          <span>Course progress</span>
          <strong>{progress}%</strong>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="stats-sidebar__status">
          <span>Trading round</span>
          <strong>{tradeResult ? `${tradeResult.money >= 0 ? '+' : ''}$${tradeResult.money}` : 'Ready'}</strong>
        </div>
        <div className="stats-sidebar__status">
          <span>Quick check</span>
          <strong>{answer === 'facts' ? 'Correct' : answer ? 'Try again' : 'Not answered'}</strong>
        </div>
        <div className="stats-sidebar__status">
          <span>Backpack</span>
          <strong>
            {ownedHints} hints · {ownedSkips} skips · {ownedRampages} rampage ·{' '}
            {Object.values(ownedBoosters).reduce((total, count) => total + count, 0)} boosters
          </strong>
        </div>
      </aside>
      {activeSection === 'home' && (
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Money basics for young learners</p>
          <h1>Investing for Kids</h1>
          <p className="hero-description">
            A playful learning app for practicing money basics without using real cash. Complete
            lessons, try pretend market rounds, earn shop items, and learn how risk, patience,
            stocks, funds, and compound growth work.
          </p>
          <p className="hero-note">Built for education only, not real investing advice.</p>
          <div className="hero-actions" aria-label="Home actions">
            <button type="button" onClick={startLearning}>
              Start learning to invest
            </button>
            <button className="ghost-button" type="button" onClick={() => activateSection('help')}>
              Tutorial
            </button>
            <button className="ghost-button" type="button" onClick={() => openAccountMode('signup')}>
              Sign in
            </button>
            <button className="ghost-button" type="button" onClick={() => openAccountMode('signin')}>
              Log in
            </button>
          </div>
        </div>

        <div className="market-board" aria-label="Pretend market chart">
          <div className="board-header">
            <span>Practice Market</span>
            <strong>Live demo</strong>
          </div>
          {sessionCompanies.slice(0, 3).map((company) => (
            <div className="ticker-row" key={company.symbol}>
              <span>{company.name}</span>
              <strong>{company.symbol} · {company.exchange}</strong>
            </div>
          ))}
          <div className="line-chart">
            <svg viewBox="0 0 360 210" role="img" aria-label="Pretend weekly line chart">
              <path className="grid-line" d="M30 42H330" />
              <path className="grid-line" d="M30 84H330" />
              <path className="grid-line" d="M30 126H330" />
              <path className="grid-line" d="M30 168H330" />
              <path className="area-line" d={sessionChart.area} />
              <path className="stock-line" d={sessionChart.line} />
              {sessionChart.points.map((point) => (
                <circle cx={point.x} cy={point.y} key={`${point.x}-${point.y}`} r="6" />
              ))}
            </svg>
            <div className="chart-labels">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
            </div>
          </div>
          <div className="fake-news-feed" aria-label="Fake market news">
            <div className="fake-news-feed__header">
              <span>Fake News</span>
              <strong>Pretend only</strong>
            </div>
            {sessionNews.map((news) => (
              <article className="fake-news-card" key={news.headline}>
                <span>{news.company}</span>
                <h3>{news.headline}</h3>
                <p>{news.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      )}

      <section id="facts" className={`section ${activeSection === 'facts' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fresh facts</p>
            <h2>Today&apos;s investing facts</h2>
          </div>
          <p className="section-copy">
            These rotate each time you open or refresh the site.
          </p>
        </div>
        <div className="fact-grid">
          {sessionFacts.map((fact, index) => (
            <article className="fact-card" key={fact}>
              <span>{index + 1}</span>
              <p>{fact}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="lessons" className={`section lessons-page ${activeSection === 'lessons' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lesson path</p>
            <h2>Level up your money brain</h2>
          </div>
          <div className="progress-card" aria-label={`${progress}% complete`}>
            <span>{completedLessons.length}/{lessons.length} complete</span>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {!lessonDifficultyChosen && (
          <div className="difficulty-greeting" role="dialog" aria-label="Choose lesson difficulty">
            <div>
              <p className="eyebrow">Choose your path</p>
              <h3>Pick a lesson difficulty</h3>
              <p>Start with the kind of levels you want to play today.</p>
            </div>
            <div className="difficulty-choice-list" role="group" aria-label="Choose lesson difficulty">
              {lessonDifficultyOptions.map((difficulty) => {
                const optionBounds = getDifficultyBounds(difficulty);

                return (
                  <button
                    className={`difficulty-choice ${lessonDifficulty === difficulty ? 'difficulty-choice--active' : ''}`}
                    key={difficulty}
                    type="button"
                    onClick={() => chooseLessonDifficulty(difficulty)}
                  >
                    <strong>{difficulty}</strong>
                    <span>
                      Levels {optionBounds.start + 1}-{optionBounds.end + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="duo-layout">
          <div className="path-shell">
            <div className="level-window-controls">
              <button
                className="ghost-button"
                disabled={lessonWindowStart <= difficultyBounds.start}
                type="button"
                onClick={() => spinToLesson(lessonWindowStart - 1)}
              >
                Previous level
              </button>
              <span>
                {lessonDifficulty} level {difficultyLevelNumber} of {difficultyLevelCount}
              </span>
              <button
                className="ghost-button"
                disabled={lessonWindowStart >= difficultyBounds.end}
                type="button"
                onClick={() => spinToLesson(lessonWindowStart + 1)}
              >
                Next level
              </button>
            </div>
            <div
              className={`path-map ${planetSpinning ? 'path-map--spinning' : ''}`}
              aria-label={`${lessonDifficulty} investing lesson level ${difficultyLevelNumber} of ${difficultyLevelCount}`}
            >
              {visibleLessons.map((lesson, index) => {
                const globalIndex = lessonWindowStart + index;
                const isComplete = completedLessons.includes(lesson.id);
                const previousLesson =
                  globalIndex > difficultyBounds.start ? lessons[globalIndex - 1] : undefined;
                const isLocked = Boolean(previousLesson && !completedLessons.includes(previousLesson.id));
                const place = getLessonPlace(globalIndex);
                const difficulty = getLessonDifficulty(globalIndex);

                return (
                  <button
                    aria-disabled={isLocked}
                    className={`path-step path-step--${place.scene} ${isComplete ? 'path-step--complete' : ''} ${
                      isLocked ? 'path-step--locked' : ''
                    }`}
                    key={lesson.id}
                    onClick={() => openLesson(lesson.id)}
                    style={{ marginLeft: index % 2 === 0 ? 0 : 54 }}
                    type="button"
                  >
                    <span>{isComplete ? 'OK' : isLocked ? 'LOCK' : lesson.badge}</span>
                    <strong>Level {globalIndex + 1}: {place.name}</strong>
                    <em className={`lesson-difficulty lesson-difficulty--${difficulty.toLowerCase()}`}>{difficulty}</em>
                    <small>{lesson.skill}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="course-panel">
            <p className="eyebrow">Course dashboard</p>
            <h3>{xp} XP earned</h3>
            <p>
              Complete each level to unlock the next one. Use Market from the sidebar to practice trading.
            </p>
            {lockedMessage && <p className="locked-message">{lockedMessage}</p>}
          </aside>
        </div>

        <div className="lesson-grid">
          {visibleLessons.map((lesson, index) => {
            const globalIndex = lessonWindowStart + index;
            const place = getLessonPlace(globalIndex);
            const difficulty = getLessonDifficulty(globalIndex);

            return (
            <article className="lesson-card" key={lesson.title}>
              <div className={`lesson-place-art lesson-place-art--${place.scene}`} aria-hidden="true" />
              <p className="lesson-place-label">Level {globalIndex + 1}: {place.name}</p>
              <p className={`lesson-difficulty lesson-difficulty--${difficulty.toLowerCase()}`}>{difficulty}</p>
              <h3>{lesson.title}</h3>
              <p>{lesson.text}</p>
              <span>{lesson.check}</span>
            </article>
            );
          })}
        </div>
      </section>

      <section id="companies" className={`section ${activeSection === 'companies' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Real companies</p>
            <h2>Company profiles you can study</h2>
          </div>
          <p className="section-copy">
            Real public companies, real tickers, and beginner-friendly notes. This is for learning, not advice to buy or sell.
          </p>
        </div>
        <div className="company-grid">
          {sessionCompanies.map((company) => (
            <article className="company-card" key={company.symbol}>
              <div className="company-card__top">
                <span className="company-symbol">{company.symbol}</span>
                <span className="company-exchange">{company.exchange}</span>
              </div>
              <h3>{company.name}</h3>
              <p className="company-known">{company.knownFor}</p>
              <div className="company-meta" aria-label={`${company.name} facts`}>
                <span>{company.sector}</span>
                <span>{company.country}</span>
                <span>Founded {company.founded}</span>
              </div>
              <p>{company.business}</p>
              <div className="company-study">
                <strong>Study this</strong>
                <span>{company.learnerFocus}</span>
              </div>
              <div className="company-details">
                <span>
                  <strong>Makes money from</strong>
                  {company.revenueStream}
                </span>
                <span>
                  <strong>Risk to watch</strong>
                  {company.risk}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="trading" className={`section day-trade ${activeSection === 'trading' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pretend day trading</p>
            <h2>Trade one fast market round</h2>
          </div>
          <p className="section-copy">
            Pick buy, short sell, or stay out before the final price is revealed. Gains add cash
            to your practice market wallet.
          </p>
        </div>

        <div className="trade-arena">
          <article className="trade-ticket">
            <div className="trade-company">
              <span>{tradeRound.company.symbol}</span>
              <div>
                <h3>{tradeRound.company.name}</h3>
                <p>{tradeRound.company.knownFor}</p>
              </div>
            </div>
            <p className="trade-news">{tradeRound.news}</p>
            <div className="trade-stats">
              <span>Start ${tradeRound.startPrice.toFixed(2)}</span>
              <span>{boostedTradeShares} shares</span>
              <span>{tradeResult ? `End $${tradeRound.endPrice.toFixed(2)}` : 'End hidden'}</span>
            </div>
            <div className="market-boosters" aria-label="Market boosters">
              <div className="market-boosters__header">
                <strong>Boosters</strong>
                <span>{activeMarketBoosters.length} active</span>
              </div>
              <div className="market-booster-grid">
                {marketBoosters.map((booster) => {
                  const isActive = activeMarketBoosters.includes(booster.id);
                  const ownedCount = ownedBoosters[booster.id];
                  const isDisabled = Boolean(tradeResult) || isActive || ownedCount < 1;

                  return (
                    <button
                      className={`market-booster ${isActive ? 'market-booster--active' : ''}`}
                      disabled={isDisabled}
                      key={booster.id}
                      title={booster.effect}
                      type="button"
                      onClick={() => activateMarketBooster(booster.id)}
                    >
                      <strong>{booster.label}</strong>
                      <span>{isActive ? 'Active' : `${ownedCount} owned`}</span>
                    </button>
                  );
                })}
              </div>
              {activeMarketBoosters.includes('insight') && !tradeResult && (
                <p className="market-insight">
                  Final move hint: {tradeRound.movePercent >= 0 ? 'up' : 'down'}
                </p>
              )}
            </div>
            <div className="trade-actions">
              <button disabled={Boolean(tradeResult)} type="button" onClick={() => makeTrade('buy')}>
                Buy
              </button>
              <button disabled={Boolean(tradeResult)} type="button" onClick={() => makeTrade('sell')}>
                Short sell
              </button>
              <button
                className="ghost-button"
                disabled={Boolean(tradeResult)}
                type="button"
                onClick={() => makeTrade('hold')}
              >
                Stay out
              </button>
            </div>
          </article>

          <article className="trade-screen">
            <div className="trade-screen__top">
              <span>Market close</span>
              <strong className={tradeRound.movePercent >= 0 ? 'move-up' : 'move-down'}>
                {tradeResult
                  ? `${tradeRound.movePercent > 0 ? '+' : ''}${tradeRound.movePercent}%`
                  : '???'}
              </strong>
            </div>
            <svg viewBox="0 0 360 210" role="img" aria-label="Pretend day trading price chart">
              <path className="grid-line" d="M30 42H330" />
              <path className="grid-line" d="M30 84H330" />
              <path className="grid-line" d="M30 126H330" />
              <path className="grid-line" d="M30 168H330" />
              {chartMode === 'line' ? (
                <>
                  <path className="area-line area-line--neutral" d={visibleTradeArea} />
                  {visibleTradeSegments.map((segment) => (
                    <path
                      className={`stock-line stock-line--${segment.direction}`}
                      d={segment.d}
                      key={segment.key}
                    />
                  ))}
                </>
              ) : (
                <g className="candle-chart" aria-label="Candle chart">
                  {visibleTradeCandles.map((candle) => (
                    <g className={`trade-candle trade-candle--${candle.direction}`} key={candle.key}>
                      <line
                        x1={candle.point.x}
                        x2={candle.point.x}
                        y1={candle.previousPoint.y}
                        y2={candle.point.y}
                      />
                      <rect height={candle.bodyHeight} rx="4" width="18" x={candle.x} y={candle.bodyY} />
                    </g>
                  ))}
                </g>
              )}
              {!tradeResult && <path className="hidden-price-line" d="M165 106L325 106" />}
              {visibleTradePoints.map((point) => (
                <circle cx={point.x} cy={point.y} key={`${point.x}-${point.price}`} r="6" />
              ))}
            </svg>
            {tradeResult && (
              <div className={`trade-result ${tradeResult.money < 0 ? 'trade-result--loss' : ''}`}>
                <strong>
                  {tradeChoice === 'buy'
                    ? 'Bought'
                    : tradeChoice === 'sell'
                      ? 'Short sold'
                      : 'No trade'}
                </strong>
                <p>{tradeResult.message}</p>
                <span>
                  {tradeResult.money >= 0 ? '+' : ''}
                  ${tradeResult.money}
                </span>
              </div>
            )}
            <button className="next-trade" type="button" onClick={resetTrade}>
              New round
            </button>
          </article>
        </div>
      </section>

      <section id="shop" className={`section shop-page ${activeSection === 'shop' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Item shop</p>
            <h2>Visit the shopkeeper</h2>
          </div>
          <p className="section-copy">
            Spend practice market cash on lesson items, then use them from your backpack during a lesson.
          </p>
        </div>

        <div className="shop-layout">
          <article className="shopkeeper-card">
            <div className="shopkeeper-shop" aria-hidden="true">
              <div className="shop-sign">SHOP</div>
              <div className="shop-awning">
                <span />
                <span />
                <span />
              </div>
              <div className="shop-shelves">
                <span>HINT</span>
                <span>PASS</span>
                <span>SKIP</span>
              </div>
              <div className="shop-details" aria-hidden="true">
                <span className="shop-lantern" />
                <span className="shop-drawer" />
              </div>
              <div className="shopkeeper-person">
                <div className="shopkeeper-face">
                  <span />
                  <span />
                </div>
              </div>
              <div className={`bye-sign ${showByeSign ? 'bye-sign--active' : ''}`}>bye</div>
              <div className="shop-counter">
                <span>ITEMS</span>
              </div>
            </div>
            <div>
              <p className="eyebrow">Shopkeeper</p>
              <h3>Welcome back, investor.</h3>
              <p>
                Earn cash in Market, then trade it here for help items. Hints reveal a clue.
                Skips move past one question.
              </p>
              {shopMessage && <p className="shop-message">{shopMessage}</p>}
            </div>
          </article>

          <div className="shop-items" aria-label="Shop items">
            <article className="shop-item">
              <span className="shop-item__icon">?</span>
              <div>
                <h3>Hint ticket</h3>
                <p>Gives one clue during a lesson question.</p>
                <strong>${hintCost}</strong>
              </div>
              <button disabled={wallet < hintCost} type="button" onClick={() => buyShopItem('hint')}>
                Buy hint
              </button>
            </article>

            <article className="shop-item">
              <span className="shop-item__icon">→</span>
              <div>
                <h3>Skip pass</h3>
                <p>Moves past one lesson question without earning XP for it.</p>
                <strong>${skipCost}</strong>
              </div>
              <button disabled={wallet < skipCost} type="button" onClick={() => buyShopItem('skip')}>
                Buy skip
              </button>
            </article>

            <article className="shop-item shop-item--premium">
              <span className="shop-item__icon">10</span>
              <div>
                <h3>Skip Rampage</h3>
                <p>Completes up to 10 lessons instantly when used inside a lesson.</p>
                <strong>${skipRampageCost}</strong>
              </div>
              <button
                disabled={wallet < skipRampageCost}
                type="button"
                onClick={() => buyShopItem('rampage')}
              >
                Buy rampage
              </button>
            </article>

            {marketBoosters.map((booster) => (
              <article className="shop-item shop-item--booster" key={booster.id}>
                <span className="shop-item__icon">B</span>
                <div>
                  <h3>{booster.label}</h3>
                  <p>{booster.effect}</p>
                  <strong>${booster.cost}</strong>
                </div>
                <button
                  disabled={wallet < booster.cost}
                  type="button"
                  onClick={() => buyShopItem(booster.id)}
                >
                  Buy booster
                </button>
              </article>
            ))}
          </div>

          <aside className="shop-backpack">
            <p className="eyebrow">Backpack</p>
            <div>
              <span>Cash</span>
              <strong>${wallet}</strong>
            </div>
            <div>
              <span>Hint tickets</span>
              <strong>{ownedHints}</strong>
            </div>
            <div>
              <span>Skip passes</span>
              <strong>{ownedSkips}</strong>
            </div>
            <div>
              <span>Skip Rampage</span>
              <strong>{ownedRampages}</strong>
            </div>
            {marketBoosters.map((booster) => (
              <div key={booster.id}>
                <span>{booster.label}</span>
                <strong>{ownedBoosters[booster.id]}</strong>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section id="decision-lab" className={`section split ${activeSection === 'decision-lab' ? 'section--active' : 'section--hidden'}`}>
        <div>
          <p className="eyebrow">Pretend decision lab</p>
          <h2>When a price goes down</h2>
          <p className="section-copy">
            A price going down is not automatically good or bad. Practice asking why before
            choosing a pretend action.
          </p>
        </div>
        <div className="scenario-list">
          {scenarios.map((scenario) => (
            <article className="scenario" key={scenario.label}>
              <h3>{scenario.label}</h3>
              <strong>{scenario.action}</strong>
              <p>{scenario.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="calculator" className={`section calculator ${activeSection === 'calculator' ? 'section--active' : 'section--hidden'}`}>
        <div>
          <p className="eyebrow">Calculator</p>
          <h2>Compound growth demo</h2>
          <p className="section-copy">
            This uses a pretend 6% yearly growth rate. Real investments do not grow smoothly.
          </p>
        </div>
        <div className="calc-panel">
          <label>
            Starting money
            <input
              min="0"
              type="number"
              value={startMoney}
              onChange={(event) => setStartMoney(Number(event.target.value))}
            />
          </label>
          <label>
            Added each month
            <input
              min="0"
              type="number"
              value={monthlyMoney}
              onChange={(event) => setMonthlyMoney(Number(event.target.value))}
            />
          </label>
          <label>
            Years
            <input
              min="1"
              max="40"
              type="number"
              value={years}
              onChange={(event) => setYears(Number(event.target.value))}
            />
          </label>
          <output>${growth.toLocaleString()}</output>
        </div>
      </section>

      <section id="dictionary" className={`section ${activeSection === 'dictionary' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <p className="eyebrow">Dictionary</p>
          <h2>Words investors use</h2>
        </div>
        <dl className="dictionary">
          {terms.map(([term, definition]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="quick-check" className={`section quiz ${activeSection === 'quick-check' ? 'section--active' : 'section--hidden'}`}>
        <div>
          <p className="eyebrow">Quick check</p>
          <h2>A stock price falls. What should you do first?</h2>
        </div>
        <div className="quiz-actions">
          <button
            type="button"
            onClick={() => {
              setAnswer('panic');
              playAnswerSound(false);
            }}
          >
            Panic sell instantly
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswer('facts');
              playAnswerSound(true);
            }}
          >
            Find out why it fell
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswer('hype');
              playAnswerSound(false);
            }}
          >
            Buy more because it is cheaper
          </button>
        </div>
        {quizMessage && <p className="quiz-result">{quizMessage}</p>}
      </section>

      <section id="achievements" className={`section achievements-page ${activeSection === 'achievements' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Achievements</p>
            <h2>Badges you have earned</h2>
          </div>
          <div className="progress-card" aria-label={`${achievementProgress}% achievements unlocked`}>
            <span>{unlockedAchievements}/{achievements.length} unlocked</span>
            <div className="progress-track">
              <span style={{ width: `${achievementProgress}%` }} />
            </div>
          </div>
        </div>

        <div className="achievement-grid">
          {achievements.map((achievement) => {
            const isClaimed = claimedAchievements.includes(achievement.id);
            const isSecretLocked = achievement.secret && !achievement.unlocked;

            return (
              <article
                className={`achievement-card ${achievement.unlocked ? 'achievement-card--unlocked' : 'achievement-card--locked'} ${
                  achievement.secret ? 'achievement-card--secret' : ''
                }`}
                key={achievement.id}
              >
                <div className="achievement-card__top">
                  <span className="achievement-icon">
                    {achievement.unlocked ? achievement.icon : achievement.secret ? '?' : 'LOCK'}
                  </span>
                  <span className="achievement-reward">+${achievement.reward}</span>
                </div>
                <div>
                  <p className="achievement-difficulty">{achievement.difficulty}</p>
                  <h3>{isSecretLocked ? 'Secret achievement' : achievement.title}</h3>
                  <p>{isSecretLocked ? `Hint: ${achievement.hint}` : achievement.detail}</p>
                </div>
                <div className="achievement-meter">
                  <span>
                    {achievement.progress}/{achievement.target}
                  </span>
                  <div className="progress-track">
                    <span style={{ width: `${Math.round((achievement.progress / achievement.target) * 100)}%` }} />
                  </div>
                </div>
                <button
                  className="achievement-claim"
                  disabled={!achievement.unlocked || isClaimed}
                  type="button"
                  onClick={() =>
                    claimAchievementReward(achievement.id, achievement.reward, achievement.unlocked)
                  }
                >
                  {isClaimed ? 'Claimed' : achievement.unlocked ? 'Claim cash' : 'Locked'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section id="piggy-bank" className={`section piggy-bank-page ${activeSection === 'piggy-bank' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('piggy.eyebrow')}</p>
            <h2>{t('piggy.title')}</h2>
          </div>
          <p className="section-copy">
            {t('piggy.copy')}
          </p>
        </div>

        <div className="piggy-bank-layout">
          <article className="piggy-balance-card">
            <p className="eyebrow">{t('piggy.balance')}</p>
            <strong>{formatRealMoney(realPiggyBank)}</strong>
            <span>{t('piggy.balanceHelp')}</span>
          </article>

          <div className="piggy-stat-grid">
            <article>
              <span>{t('piggy.gameCash')}</span>
              <strong>${wallet.toLocaleString()}</strong>
            </article>
            <article>
              <span>{t('piggy.realCurrency')}</span>
              <strong>{currency}</strong>
            </article>
            <article>
              <span>{t('piggy.quickAdd')}</span>
              <strong>{[1, 5, 10].map((amount) => formatRealMoney(amount)).join(' / ')}</strong>
            </article>
            <article>
              <span>{t('piggy.status')}</span>
              <strong>{realPiggyBank > 0 ? t('piggy.saving') : t('piggy.empty')}</strong>
            </article>
          </div>

          <article className="piggy-controls">
            <p className="eyebrow">{t('piggy.addMoney')}</p>
            <div className="piggy-quick-actions">
              {[1, 5, 10, 20].map((amount) => (
                <button key={amount} type="button" onClick={() => changeRealPiggyBank(amount)}>
                  +{formatRealMoney(amount)}
                </button>
              ))}
            </div>
            <form className="piggy-custom-form" onSubmit={addCustomRealMoney}>
              <label>
                {t('piggy.customAmount')}
                <input
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={realPiggyAmount}
                  onChange={(event) => setRealPiggyAmount(event.target.value)}
                />
              </label>
              <button type="submit">{t('piggy.add')}</button>
            </form>
          </article>

          <article className="piggy-afford">
            <p className="eyebrow">{t('piggy.spend')}</p>
            <p>{t('piggy.spendHelp')}</p>
            <div className="piggy-quick-actions">
              {[1, 5, 10, 20].map((amount) => (
                <button
                  className="ghost-button"
                  disabled={realPiggyBank <= 0}
                  key={amount}
                  type="button"
                  onClick={() => changeRealPiggyBank(-amount)}
                >
                  -{formatRealMoney(amount)}
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section id="secret-game" className={`section secret-game-page ${activeSection === 'secret-game' ? 'section--active' : 'section--hidden'}`}>
        <div className="vault-portal">
          <aside className="vault-rail" aria-label="Game categories">
            {['⌂', '★', '⚡', '◆', '●', '⚙'].map((icon) => (
              <button key={icon} type="button">{icon}</button>
            ))}
          </aside>

          <div className="vault-main">
            <div className="vault-topbar">
              <div className="vault-brand">
                <span>V</span>
                <strong>vault games</strong>
              </div>
              <label className="vault-search">
                <span>Search games and categories</span>
                <input aria-label="Search games and categories" readOnly value="" />
              </label>
              <div className="vault-actions">
                <span>${wallet.toLocaleString()}</span>
                <button type="button" onClick={() => setActiveSection('piggy-bank')}>Piggy</button>
              </div>
            </div>

            <div className="vault-hero-strip">
              {[
                { id: 'snake', label: 'Snake', tag: 'Free arcade', art: 'snake' },
                { id: 'breaker', label: 'Block Breaker', tag: 'Free classic', art: 'breaker' },
                { id: 'tiles', label: 'Safe Tiles', tag: 'Free vault', art: 'tiles' },
              ].map((game) => (
                <button
                  className={`vault-wide-card vault-card-art--${game.art}`}
                  key={game.id}
                  type="button"
                  onClick={() => {
                    setActiveVaultGame(game.id as VaultGameId);
                    setSecretGameMessage(`${game.label} selected. Free to play.`);
                  }}
                >
                  <span>{game.tag}</span>
                  <strong>{game.label}</strong>
                </button>
              ))}
            </div>

            <div className="vault-section-title">
              <h2>New games</h2>
              <span>Wins: {secretGameScore}</span>
            </div>

            <div className="vault-card-row">
              {[
                { id: 'snake', label: 'Snake', reward: 'Free', art: 'snake' },
                { id: 'breaker', label: 'Block Breaker', reward: 'Free', art: 'breaker' },
                { id: 'tiles', label: 'Safe Tiles', reward: 'Free', art: 'tiles' },
                { id: 'code', label: 'Code Breaker', reward: 'Free', art: 'code' },
                { id: 'market', label: 'Market Guess', reward: 'Free', art: 'market' },
              ].map((game) => (
                <button
                  className={`vault-game-card vault-card-art--${game.art} ${
                    activeVaultGame === game.id ? 'vault-game-card--active' : ''
                  }`}
                  key={game.id}
                  type="button"
                  onClick={() => {
                    setActiveVaultGame(game.id as VaultGameId);
                    setSecretGameMessage(`${game.label} selected. Free to play.`);
                  }}
                >
                  <span>{game.reward}</span>
                  <strong>{game.label}</strong>
                </button>
              ))}
            </div>

            <div className="vault-section-title">
              <h2>Play now</h2>
              <span>{secretGameMessage}</span>
            </div>

            <article className="secret-game-board-card">
            {activeVaultGame === 'tiles' ? (
              <>
                <p className="eyebrow">Safe Tiles</p>
                <div className="secret-game-board" aria-label="Secret vault tile game">
                  {Array.from({ length: 9 }, (_, tileIndex) => (
                    <button
                      className="secret-tile"
                      key={tileIndex}
                      type="button"
                      onClick={() => playSecretGameTile(tileIndex)}
                      aria-label={`Vault tile ${tileIndex + 1}`}
                    >
                      ?
                    </button>
                  ))}
                </div>
              </>
            ) : activeVaultGame === 'snake' ? (
              <div className="vault-snake-game">
                <p className="eyebrow">Snake</p>
                <strong>Score: {snakeScore}</strong>
                <div className="vault-snake-board" aria-label="Snake game board">
                  {Array.from({ length: snakeBoardSize * snakeBoardSize }, (_, cellIndex) => {
                    const cell = {
                      x: cellIndex % snakeBoardSize,
                      y: Math.floor(cellIndex / snakeBoardSize),
                    };
                    const isSnake = snake.some((snakeCell) => snakeCell.x === cell.x && snakeCell.y === cell.y);
                    const isHead = snake[0]?.x === cell.x && snake[0]?.y === cell.y;
                    const isFood = snakeFood.x === cell.x && snakeFood.y === cell.y;

                    return (
                      <span
                        className={`vault-snake-cell ${isSnake ? 'vault-snake-cell--body' : ''} ${
                          isHead ? 'vault-snake-cell--head' : ''
                        } ${isFood ? 'vault-snake-cell--food' : ''}`}
                        key={`${cell.x}-${cell.y}`}
                      />
                    );
                  })}
                </div>
                <div className="vault-direction-pad" aria-label="Snake controls">
                  <button type="button" onClick={() => changeSnakeDirection({ x: 0, y: -1 })}>
                    Up
                  </button>
                  <button type="button" onClick={() => changeSnakeDirection({ x: -1, y: 0 })}>
                    Left
                  </button>
                  <button type="button" onClick={() => changeSnakeDirection({ x: 1, y: 0 })}>
                    Right
                  </button>
                  <button type="button" onClick={() => changeSnakeDirection({ x: 0, y: 1 })}>
                    Down
                  </button>
                </div>
                <button type="button" onClick={resetSnakeGame}>
                  {snakeRunning ? 'Restart Snake' : 'Start Snake'}
                </button>
              </div>
            ) : activeVaultGame === 'breaker' ? (
              <div className="vault-breaker-game">
                <p className="eyebrow">Block Breaker</p>
                <strong>Blocks: {breakerScore}</strong>
                <div className="vault-breaker-board" aria-label="Block Breaker game board">
                  {breakerBricks.map((brick) => {
                    const column = brick % 6;
                    const row = Math.floor(brick / 6);

                    return (
                      <span
                        className="vault-breaker-brick"
                        key={brick}
                        style={{
                          left: `${5 + column * 15}%`,
                          top: `${10 + row * 10}%`,
                        }}
                      />
                    );
                  })}
                  <span
                    className="vault-breaker-ball"
                    style={{ left: `${breakerBall.x}%`, top: `${breakerBall.y}%` }}
                  />
                  <span className="vault-breaker-paddle" style={{ left: `${breakerPaddle}%` }} />
                </div>
                <div className="vault-market-actions">
                  <button type="button" onClick={() => moveBreakerPaddle(-8)}>
                    Left
                  </button>
                  <button type="button" onClick={() => moveBreakerPaddle(8)}>
                    Right
                  </button>
                </div>
                <button type="button" onClick={resetBreakerGame}>
                  {breakerRunning ? 'Restart Block Breaker' : 'Start Block Breaker'}
                </button>
              </div>
            ) : activeVaultGame === 'code' ? (
              <div className="vault-code-game">
                <p className="eyebrow">Code Breaker</p>
                <strong>Find the vault code</strong>
                <div className="vault-code-options">
                  {['123', '231', '312'].map((code) => (
                    <button key={code} type="button" onClick={() => playVaultCode(code)}>
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="vault-market-game">
                <p className="eyebrow">Market Guess</p>
                <strong>Will the mini market go up or down?</strong>
                <div className="vault-market-chart" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="vault-market-actions">
                  <button type="button" onClick={() => playMarketGuess('up')}>
                    Up
                  </button>
                  <button type="button" onClick={() => playMarketGuess('down')}>
                    Down
                  </button>
                </div>
              </div>
            )}
            </article>
          </div>
        </div>
      </section>

      <section id="help" className={`section help-page ${activeSection === 'help' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pushy Help</p>
            <h2>Ask Pushy</h2>
          </div>
          <p className="section-copy">
            Ask about lessons, investing words, the market game, achievements, or Piggy Bank goals.
          </p>
        </div>

        <div className="help-layout">
          <article className="help-panel">
            <div
              className={`verity-card ${aiBusy ? 'verity-card--thinking' : ''}`}
              aria-label="Pushy AI helper"
            >
              <div className="verity-world">
                <span className="pushy-speed-line pushy-speed-line--one" aria-hidden="true" />
                <span className="pushy-speed-line pushy-speed-line--two" aria-hidden="true" />
                <span className="pushy-thruster pushy-thruster--left" aria-hidden="true" />
                <span className="pushy-thruster pushy-thruster--right" aria-hidden="true" />
                <span className="pushy-landing-burst" aria-hidden="true" />
                <span className="pushy-sparks" aria-hidden="true" />
                <img className="pushy-robot" src="/assets/verity-robot-front.png" alt="Pushy robot helper" />
              </div>
              {aiError ? (
                <p className="help-error">{aiError}</p>
              ) : aiAnswer ? (
                <div className="verity-answer-bubble">
                  <p>
                    <span aria-hidden="true">&gt;&gt; </span>
                    {displayedAiAnswer || aiAnswer}
                  </p>
                </div>
              ) : (
                <div className="verity-answer-bubble verity-answer-bubble--empty">
                  <p>Pushy answers will show up here.</p>
                </div>
              )}
            </div>
            <p className="eyebrow">Question</p>
            <form className="help-form" onSubmit={askVerityForHelp}>
              <label>
                What do you want help with?
                <textarea
                  rows={5}
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  placeholder="Example: explain diversification in a simple way"
                />
              </label>
              <button disabled={aiBusy} type="submit">
                {aiBusy ? 'Asking Pushy...' : 'Ask Pushy'}
              </button>
            </form>
            <div className="help-suggestions" aria-label="Quick questions">
              {[
                'Explain compound growth',
                'How does the market game work?',
                'Give me a saving goal',
              ].map((question) => (
                <button key={question} type="button" onClick={() => setAiPrompt(question)}>
                  {question}
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section id="account" className={`section account-page ${activeSection === 'account' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Account</p>
            <h2>Save your progress</h2>
          </div>
          <p className="section-copy">
            Create an account to sync lessons, XP, cash, backpack items, skips, and your theme.
          </p>
        </div>

        <div className="account-layout">
          <article className="account-panel">
            {session ? (
              <>
                <p className="eyebrow">Signed in</p>
                <h3>{session.user.email}</h3>
                <p>Your progress saves automatically while you play.</p>
                <button className="ghost-button" type="button" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <p className="eyebrow">{authMode === 'signin' ? 'Welcome back' : 'New account'}</p>
                <h3>{authMode === 'signin' ? 'Sign in' : 'Create account'}</h3>
                <button
                  className="google-auth-button"
                  disabled={authBusy}
                  type="button"
                  onClick={signInWithGoogle}
                >
                  <span aria-hidden="true">G</span>
                  Continue with Google
                </button>
                <form className="account-form" onSubmit={handleAuthSubmit}>
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                    />
                  </label>
                  <label>
                    Password
                    <input
                      minLength={6}
                      required
                      type="password"
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                    />
                  </label>
                  <button disabled={authBusy} type="submit">
                    {authBusy ? 'Working...' : authMode === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                </form>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setAuthMode((current) => (current === 'signin' ? 'signup' : 'signin'));
                    setAuthMessage('');
                  }}
                >
                  {authMode === 'signin' ? 'Create an account' : 'I already have an account'}
                </button>
              </>
            )}
            {authMessage && <p className="account-message">{authMessage}</p>}
          </article>

          <aside className="account-panel account-panel--status">
            <p className="eyebrow">Cloud save</p>
            <h3>{saveStatus}</h3>
            <div className="account-save-grid">
              <span>{completedLessons.length}/{lessons.length} lessons</span>
              <span>{xp} XP</span>
              <span>${wallet} cash</span>
              <span>{formatRealMoney(realPiggyBank)} real</span>
              <span>{ownedHints} hints</span>
              <span>{ownedSkips} skips</span>
              <span>{ownedRampages} rampage</span>
              <span>{Object.values(ownedBoosters).reduce((total, count) => total + count, 0)} boosters</span>
              <span>{theme} theme</span>
            </div>
          </aside>
        </div>
      </section>

      <section id="settings" className={`section settings-page ${activeSection === 'settings' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>{t('settings.title')}</h2>
          </div>
          <p className="section-copy">
            {t('settings.copy')}
          </p>
        </div>
        <div className="settings-grid">
          {themePicker}
          {cursorSettings}
          {languageSettings}
          {currencySettings}
          {lessonDifficultySettings}
          {chartSettings}
          {musicSettings}
        </div>
      </section>
    </main>
  );
}

export default App;
