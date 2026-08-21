export const CA_SUBJECTS = [
  { id: 'Business Laws', name: 'Paper 2: Business Laws', code: 'LAW', icon: '⚖️', color: 'indigo' },
  { id: 'Accounting', name: 'Paper 1: Accounting', code: 'ACC', icon: '📊', color: 'emerald' },
  { id: 'Quantitative Aptitude', name: 'Paper 3: Quantitative Aptitude', code: 'MATH', icon: '📐', color: 'amber' },
  { id: 'Business Economics', name: 'Paper 4: Business Economics', code: 'ECO', icon: '📈', color: 'blue' }
];

export const SAMPLE_QUESTIONS = [
  {
    title: 'Business Laws - Valid Contract Elements',
    subject: 'Business Laws',
    max_marks: 5,
    question: 'State the essential elements of a valid contract as per Section 10 of the Indian Contract Act, 1872.',
    student_answer: `According to the Indian Contract Act 1872, an agreement becomes a valid contract if it satisfies certain essentials:
1. Offer and Acceptance: There must be a lawful offer by one party and lawful acceptance by another.
2. Consideration: Quid pro quo (something in return) is required.
3. Capacity to contract: The parties must be majors, of sound mind, and not disqualified by law.
4. Intention to create legal relationship: Parties must intend to create legal obligations (e.g. Balfour v Balfour).

Hence, these elements make an agreement enforceable.`
  },
  {
    title: 'Accounting - Capital vs Revenue Expenditure',
    subject: 'Accounting',
    max_marks: 4,
    question: 'Distinguish between Capital Expenditure and Revenue Expenditure with suitable examples per ICAI Accounting principles.',
    student_answer: `Capital Expenditure vs Revenue Expenditure:

1. Nature: Capital expenditure is non-recurring in nature, whereas Revenue expenditure is recurring in day-to-day business.
2. Benefit period: Capital expenditure yields benefits over multiple accounting periods (long term), while Revenue expenditure benefits only the current accounting year.
3. Treatment in Financial Statements: Capital expenditure is shown in the Balance Sheet as an asset, while Revenue expenditure is debited to Trading or Profit & Loss Account.
4. Example: Cost of purchasing machinery is Capital expenditure, whereas repair of machinery is Revenue expenditure.`
  },
  {
    title: 'Quantitative Aptitude - Compound Interest Working',
    subject: 'Quantitative Aptitude',
    max_marks: 5,
    question: 'A sum of ₹10,000 is invested at 10% per annum compound interest compounded half-yearly for 1.5 years. Calculate the compound amount and compound interest earned step by step.',
    student_answer: `Given:
Principal (P) = ₹10,000
Annual Rate (R) = 10% p.a.
Since it is compounded half-yearly:
Half-yearly rate (i) = 10% / 2 = 5% = 0.05 per half year
Time (t) = 1.5 years => Number of conversion periods (n) = 1.5 * 2 = 3 periods

Step 1: Formula for Compound Amount
A = P * (1 + i)^n

Step 2: Substitution
A = 10000 * (1 + 0.05)^3
A = 10000 * (1.05)^3
A = 10000 * 1.157625
A = ₹11,576.25

Step 3: Compound Interest
CI = Amount - Principal
CI = 11,576.25 - 10,000 = ₹1,576.25

Final Compound Amount = ₹11,576.25 and Compound Interest = ₹1,576.25`
  },
  {
    title: 'Business Economics - Law of Demand & Exceptions',
    subject: 'Business Economics',
    max_marks: 5,
    question: 'Explain the Law of Demand, its key assumptions, and state any two exceptions to the Law of Demand.',
    student_answer: `The Law of Demand states that other things being equal (Ceteris Paribus), if the price of a good increases, its quantity demanded decreases, and vice versa. It shows an inverse relationship between price and quantity demanded.

Assumptions:
1. Income of the consumer remains constant.
2. Prices of related goods (substitutes and complements) remain unchanged.
3. Consumer tastes and preferences remain identical.

Exceptions:
1. Giffen Goods: Inferior goods where demand falls when price falls (e.g. staple bread/coarse grains).
2. Conspicuous Goods (Veblen effect): Prestige goods like diamonds whose demand increases with higher price due to status appeal.`
  }
];
