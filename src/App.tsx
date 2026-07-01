import { useEffect, useMemo, useRef, useState } from 'react';

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

const hintCost = 10;
const skipCost = 25;

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

const kidKnownCompanies = [
  {
    name: 'Apple',
    symbol: 'AAPL',
    knownFor: 'iPhone, iPad, Mac, AirPods',
  },
  {
    name: 'Samsung',
    symbol: 'SMSN',
    knownFor: 'Galaxy phones, TVs, tablets',
  },
  {
    name: 'Nintendo',
    symbol: 'NTDOY',
    knownFor: 'Switch, Mario, Zelda',
  },
  {
    name: 'Disney',
    symbol: 'DIS',
    knownFor: 'Movies, parks, Marvel, Pixar',
  },
  {
    name: 'Roblox',
    symbol: 'RBLX',
    knownFor: 'Roblox games and creators',
  },
  {
    name: 'Nike',
    symbol: 'NKE',
    knownFor: 'Shoes, sportswear, athletes',
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
] as const;

type ThemeId = (typeof themes)[number]['id'];

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
] as const;

type MusicTrackId = (typeof musicTracks)[number]['id'];
type SectionId =
  | 'home'
  | 'lessons'
  | 'facts'
  | 'trading'
  | 'companies'
  | 'decision-lab'
  | 'calculator'
  | 'dictionary'
  | 'quick-check'
  | 'settings';

const sidebarItems: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'lessons', label: 'Lessons', icon: '▣' },
  { id: 'facts', label: 'Facts', icon: 'i' },
  { id: 'trading', label: 'Trading', icon: '$' },
  { id: 'companies', label: 'Companies', icon: '◆' },
  { id: 'decision-lab', label: 'Decision Lab', icon: '?' },
  { id: 'calculator', label: 'Calculator', icon: '+' },
  { id: 'dictionary', label: 'Dictionary', icon: 'A' },
  { id: 'quick-check', label: 'Quiz', icon: '✓' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

function getRandomMove() {
  let move = Number((Math.random() * 9 - 4.5).toFixed(1));

  if (Math.abs(move) < 0.4) {
    move = move < 0 ? -0.7 : 0.7;
  }

  return {
    move: `${move > 0 ? '+' : ''}${move.toFixed(1)}%`,
    tone: move >= 0 ? 'up' : 'down',
  };
}

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
  const [activeLessonId, setActiveLessonId] = useState(lessons[0].id);
  const [lessonWindowStart, setLessonWindowStart] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [lessonAnswer, setLessonAnswer] = useState('');
  const [lessonHint, setLessonHint] = useState('');
  const [helperMessage, setHelperMessage] = useState('');
  const [lessonMistakes, setLessonMistakes] = useState<LessonMistake[]>([]);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [skippedQuestions, setSkippedQuestions] = useState<string[]>([]);
  const [xp, setXp] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [levelNotice, setLevelNotice] = useState<number | null>(null);
  const [lockedMessage, setLockedMessage] = useState('');
  const [startMoney, setStartMoney] = useState(100);
  const [monthlyMoney, setMonthlyMoney] = useState(10);
  const [years, setYears] = useState(10);
  const [answer, setAnswer] = useState('');
  const [tradeRound, setTradeRound] = useState(() => makeTradeRound());
  const [tradeChoice, setTradeChoice] = useState<'buy' | 'sell' | 'hold' | ''>('');
  const [tradeResult, setTradeResult] = useState<{
    money: number;
    message: string;
  } | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrackId>('focus');
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(35);
  const musicContextRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];
  const activeQuestion = activeLesson.questions[questionIndex] ?? activeLesson.questions[0];
  const activeLessonIndex = lessons.findIndex((lesson) => lesson.id === activeLesson.id);
  const isFinalQuestion = questionIndex === activeLesson.questions.length - 1;
  const activeQuestionKey = `${activeLesson.id}-${questionIndex}`;
  const wasSkipped = skippedQuestions.includes(activeQuestionKey);
  const level = Math.floor(xp / 100) + 1;
  const xpIntoLevel = xp % 100;
  const progress = Math.round((completedLessons.length / lessons.length) * 100);
  const lessonProgress = Math.round(((questionIndex + (lessonAnswer === activeQuestion.correct ? 1 : 0)) / activeLesson.questions.length) * 100);
  const visibleLessons = lessons.slice(lessonWindowStart, lessonWindowStart + 4);
  const lessonWindowNumber = Math.floor(lessonWindowStart / 4) + 1;
  const totalLessonWindows = Math.ceil(lessons.length / 4);
  const sessionCompanies = useMemo(
    () =>
      shuffleItems(kidKnownCompanies).map((company) => ({
        ...company,
        ...getRandomMove(),
      })),
    [],
  );
  const sessionFacts = useMemo(() => shuffleItems(investingFacts).slice(0, 3), []);
  const sessionNews = useMemo(() => shuffleItems(fakeMarketNews).slice(0, 3), []);
  const sessionChart = useMemo(() => makeChartPath(), []);
  const activeMusicTrack =
    musicTracks.find((musicTrack) => musicTrack.id === selectedMusic) ?? musicTracks[0];

  useEffect(() => {
    if (!levelNotice) {
      return;
    }

    const timeout = window.setTimeout(() => setLevelNotice(null), 3200);

    return () => window.clearTimeout(timeout);
  }, [levelNotice]);

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
    const previousLesson = lessons[lessonIndex - 1];

    if (previousLesson && !completedLessons.includes(previousLesson.id)) {
      setLockedMessage(`Complete lesson ${lessonIndex} first to unlock this level.`);
      return;
    }

    setLockedMessage('');
    setLessonWindowStart(Math.floor(lessonIndex / 4) * 4);
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

  const answerLessonQuestion = (choice: string) => {
    const isCorrectChoice = choice === activeQuestion.correct;
    const alreadyAnsweredCorrectly = lessonAnswer === activeQuestion.correct;

    if (alreadyAnsweredCorrectly) {
      return;
    }

    setLessonAnswer(choice);
    playAnswerSound(isCorrectChoice);

    if (!isCorrectChoice) {
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
    }

    if (isCorrectChoice && !alreadyAnsweredCorrectly && !wasSkipped) {
      changeXp(10);
    }

    if (isCorrectChoice && isFinalQuestion) {
      setCompletedLessons((current) =>
        current.includes(activeLesson.id) ? current : [...current, activeLesson.id],
      );
    }
  };

  const buyHint = () => {
    if (wallet < hintCost || lessonHint || lessonAnswer) {
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

    setWallet((current) => current - hintCost);
    setLessonHint(`Hint: ${clue}`);
    setHelperMessage(`Hint bought for $${hintCost}.`);
    playAnswerSound(true);
  };

  const skipQuestion = () => {
    if (wallet < skipCost || lessonAnswer) {
      return;
    }

    setWallet((current) => current - skipCost);
    setSkippedQuestions((current) =>
      current.includes(activeQuestionKey) ? current : [...current, activeQuestionKey],
    );
    changeXp(10);
    setLessonHint('');
    setHelperMessage('');
    playAnswerSound(true);

    if (isFinalQuestion) {
      setLessonAnswer(activeQuestion.correct);
      setHelperMessage(`Skipped for $${skipCost}. You still earned 10 XP.`);
      setCompletedLessons((current) =>
        current.includes(activeLesson.id) ? current : [...current, activeLesson.id],
      );
      return;
    }

    setQuestionIndex((current) => current + 1);
    setLessonAnswer('');
    setReviewComplete(false);
  };

  const openNextLesson = () => {
    const nextLesson = lessons[activeLessonIndex + 1];

    if (nextLesson) {
      setLessonWindowStart(Math.floor((activeLessonIndex + 1) / 4) * 4);
      openLesson(nextLesson.id);
      return;
    }

    goToCourse();
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
  const visibleTradePoints = tradeResult ? tradeRound.points : tradeRound.points.slice(0, 3);
  const visibleTradeLine = visibleTradePoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join('');
  const lastVisibleTradePoint = visibleTradePoints[visibleTradePoints.length - 1];
  const visibleTradeArea = `${visibleTradeLine}L${lastVisibleTradePoint?.x ?? 35} 184L35 184Z`;

  const makeTrade = (choice: 'buy' | 'sell' | 'hold') => {
    const priceMove = tradeRound.endPrice - tradeRound.startPrice;
    const money =
      choice === 'buy'
        ? priceMove * tradeRound.shares
        : choice === 'sell'
          ? -priceMove * tradeRound.shares
          : 0;
    const roundedMoney = Math.round(money);

    setTradeChoice(choice);
    setWallet((current) => Math.max(0, current + roundedMoney));
    playAnswerSound(roundedMoney >= 0);
    setTradeResult({
      money: roundedMoney,
      message:
        choice === 'hold'
          ? 'You stayed out. Sometimes no trade is a smart trade, but this round gives $0.'
          : roundedMoney > 0
            ? `Nice timing. Your pretend trade made $${roundedMoney}. You can spend it on hints and skips.`
            : roundedMoney < 0
              ? `That trade lost $${Math.abs(roundedMoney)} from your cash wallet.`
              : 'Break-even trade. No money gained or lost.',
    });
  };

  const resetTrade = () => {
    setTradeRound(makeTradeRound());
    setTradeChoice('');
    setTradeResult(null);
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

  if (false && page === 'lesson') {
    return (
      <main className={`app-shell theme-${theme} lesson-page`}>
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
            <div className="lesson-shop" aria-label="Question helpers">
              <div>
                <strong>${wallet}</strong>
                <span>Trading cash</span>
              </div>
              <button
                className="ghost-button"
                disabled={wallet < hintCost || Boolean(lessonHint) || Boolean(lessonAnswer)}
                type="button"
                onClick={buyHint}
              >
                Hint ${hintCost}
              </button>
              <button
                className="ghost-button"
                disabled={wallet < skipCost || Boolean(lessonAnswer)}
                type="button"
                onClick={skipQuestion}
              >
                Skip ${skipCost}
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
                      ? 'Lesson complete. Skip used, and you still earned XP.'
                      : 'Lesson complete. You earned XP.'
                    : wasSkipped
                      ? 'Skipped. You earned XP and moved forward.'
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
    <main className={`app-shell theme-${theme} ${page === 'lesson' ? 'lesson-open' : ''}`}>
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
            aria-label={item.label}
            className={activeSection === item.id ? 'quick-nav__active' : ''}
            key={item.id}
            title={item.label}
            type="button"
            onClick={() => activateSection(item.id)}
          >
            <span className="sidebar-nav__icon" aria-hidden="true">{item.icon}</span>
            <span className="sidebar-nav__label">{item.label}</span>
          </button>
        ))}
      </aside>
      {activeSection === 'home' && (
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Money basics for young learners</p>
          <h1>Investing for Kids</h1>
          <p>
            Follow a level path, answer quick checks, and learn stocks, risk, patience, and
            compound growth with pretend examples. This site is for education only.
          </p>
          <div className="hero-chips">
            <span>Level {level}</span>
            <span>{lessons.length} lessons</span>
            <span>{lessons.reduce((total, lesson) => total + lesson.questions.length, 0)} questions</span>
            <span>{xp} XP</span>
            <span>${wallet} cash</span>
          </div>
        </div>

        <div className="market-board" aria-label="Pretend market chart">
          <div className="board-header">
            <span>Practice Market</span>
            <strong>Live demo</strong>
          </div>
          {sessionCompanies.slice(0, 3).map((company) => (
            <div
              className={`ticker-row ${company.tone === 'down' ? 'ticker-row--down' : ''}`}
              key={company.symbol}
            >
              <span>{company.name}</span>
              <strong>{company.move}</strong>
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

      <section id="lessons" className={`section ${activeSection === 'lessons' ? 'section--active' : 'section--hidden'}`}>
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

        <div className="duo-layout">
          <div className="path-shell">
            <div className="level-window-controls">
              <button
                className="ghost-button"
                disabled={lessonWindowStart === 0}
                type="button"
                onClick={() => setLessonWindowStart((current) => Math.max(0, current - 4))}
              >
                Previous 4
              </button>
              <span>
                Levels {lessonWindowStart + 1}-{Math.min(lessonWindowStart + 4, lessons.length)} of {lessons.length}
              </span>
              <button
                className="ghost-button"
                disabled={lessonWindowStart + 4 >= lessons.length}
                type="button"
                onClick={() =>
                  setLessonWindowStart((current) => Math.min(lessons.length - 4, current + 4))
                }
              >
                Next 4
              </button>
            </div>
            <div className="path-map" aria-label={`Investing lesson path page ${lessonWindowNumber} of ${totalLessonWindows}`}>
              {visibleLessons.map((lesson, index) => {
                const globalIndex = lessonWindowStart + index;
              const isComplete = completedLessons.includes(lesson.id);
              const previousLesson = lessons[globalIndex - 1];
              const isLocked = Boolean(previousLesson && !completedLessons.includes(previousLesson.id));

              return (
                <button
                  aria-disabled={isLocked}
                  className={`path-step ${isComplete ? 'path-step--complete' : ''} ${
                    isLocked ? 'path-step--locked' : ''
                  }`}
                  key={lesson.id}
                  onClick={() => openLesson(lesson.id)}
                  style={{ marginLeft: index % 2 === 0 ? 0 : 54 }}
                  type="button"
                >
                  <span>{isComplete ? 'OK' : isLocked ? '🔒' : lesson.badge}</span>
                  <strong>{lesson.skill}</strong>
                </button>
              );
              })}
            </div>
          </div>

          <aside className="course-panel">
            <p className="eyebrow">Course dashboard</p>
            <h3>{xp} XP earned</h3>
            <p>
              Complete each level to unlock the next one. Trade to earn cash for hints and skips.
            </p>
            {lockedMessage && <p className="locked-message">{lockedMessage}</p>}
            <div className="stat-strip">
              <span>Level {level}</span>
              <span>{lessons.length} lessons</span>
              <span>{lessons.reduce((total, lesson) => total + lesson.questions.length, 0)} questions</span>
              <span>{xpIntoLevel}/100 XP</span>
              <span>${wallet} cash</span>
            </div>
          </aside>
        </div>

        {page === 'lesson' && (
          <section id="active-lesson" className="inline-lesson">
            <div className="lesson-brief">
              <p className="eyebrow">Lesson {activeLesson.badge}</p>
              <h2>{activeLesson.title.replace(`${activeLesson.badge}. `, '')}</h2>
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
              <div className="lesson-shop" aria-label="Question helpers">
                <div>
                  <strong>${wallet}</strong>
                  <span>Trading cash</span>
                </div>
                <button
                  className="ghost-button"
                  disabled={wallet < hintCost || Boolean(lessonHint) || Boolean(lessonAnswer)}
                  type="button"
                  onClick={buyHint}
                >
                  Hint ${hintCost}
                </button>
                <button
                  className="ghost-button"
                  disabled={wallet < skipCost || Boolean(lessonAnswer)}
                  type="button"
                  onClick={skipQuestion}
                >
                  Skip ${skipCost}
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
                        ? 'Lesson complete. Skip used, and you still earned XP.'
                        : 'Lesson complete. You earned XP.'
                      : wasSkipped
                        ? 'Skipped. You earned XP and moved forward.'
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
                    Close lesson
                  </button>
                  <button type="button" onClick={openNextLesson}>
                    {lessons[activeLessonIndex + 1] ? 'Next lesson' : 'Finish course'}
                  </button>
                </div>
              )}
            </article>
          </section>
        )}

        <div className="lesson-grid">
          {visibleLessons.map((lesson) => (
            <article className="lesson-card" key={lesson.title}>
              <h3>{lesson.title}</h3>
              <p>{lesson.text}</p>
              <span>{lesson.check}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="companies" className={`section ${activeSection === 'companies' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Company examples</p>
            <h2>Brands you might know</h2>
          </div>
          <p className="section-copy">
            These are pretend watchlist moves for learning only, not advice to buy or sell.
          </p>
        </div>
        <div className="company-grid">
          {sessionCompanies.map((company) => (
            <article className="company-card" key={company.symbol}>
              <div>
                <span className="company-symbol">{company.symbol}</span>
                <strong className={company.tone === 'down' ? 'move-down' : 'move-up'}>
                  {company.move}
                </strong>
              </div>
              <h3>{company.name}</h3>
              <p>{company.knownFor}</p>
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
            you can spend on lesson hints and skips.
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
              <span>{tradeRound.shares} shares</span>
              <span>{tradeResult ? `End $${tradeRound.endPrice.toFixed(2)}` : 'End hidden'}</span>
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
              <path className="area-line" d={visibleTradeArea} />
              <path className="stock-line" d={visibleTradeLine} />
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

      <section id="settings" className={`section settings-page ${activeSection === 'settings' ? 'section--active' : 'section--hidden'}`}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Customize the site</h2>
          </div>
          <p className="section-copy">
            Change the background and music from one place.
          </p>
        </div>
        <div className="settings-grid">
          {themePicker}
          {musicSettings}
        </div>
      </section>
    </main>
  );
}

export default App;
