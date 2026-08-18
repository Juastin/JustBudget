# Personal Financial Insights Dashboard - Requirements

## Overview

Create a personal financial insights application that runs as a Home Assistant application/dashboard and imports transaction data from Rabobank transaction exports.

The primary goal is to provide clear insight into:

1. Budget management for recurring and variable expenses
2. Available savings and reservation tracking
3. Automatic transaction categorization and learning

The system should focus on simplicity and actionable insights rather than accounting features.

---

# Core Principles

The application should answer the following questions immediately:

- How much money do we have left this month?
- Are we staying within our budgets?
- How much do we usually spend per category?
- What recurring expenses are coming up?
- Can we afford a planned purchase?

---

# Data Source

## Transaction Import

Transactions are imported from Rabobank transaction exports.

An importer already exists. It's inside: `services\pdf_import_service.py`. Please make sure to use this service as reference for creating a new importer for Rabobank transaction exports in NextJS.

The application should be designed so that:
- The importer can be easily replaced with a different source in the future.
- The importer should be able to grab the transaction information solely so changing the source should not affect the rest of the application.
- The categorizations should be done in the application itself, not in the importer.

---

# Feature 1: Budget Management

## Categories

Users should be able to create expense categories such as:

### Vaste Maandelijkse Lasten

- Hypotheek
- Elektriciteit
- Gas
- Water
- Internet
- Mobiele telefoon
- Verzekeringen
- Kinderopvang
- Belastingen

### Variabele Uitgaven

- Boodschappen
- Uit eten
- Brandstof
- Winkelen
- Entertainment
- Hobby's
- Vakantie
- Huishouden

### Spaarcategorieën

- Vakantiefonds
- Vervanging auto
- Beleggingen
- Afschrijvingen

---

## Budget Configuration

Each category can have:

- Monthly budget
- Expected monthly amount
- Optional warning threshold
- Category color/icon

Example:

```json
{
  "category": "Boodschappen",
  "monthlyBudget": 600
}
```

---

## Budget Insights

For each category show:

### Budget

Current configured budget.

### Current Spend

Total spending this month.

### Remaining Budget

Budget minus current spend.

---

## Budget Dashboard

Display cards such as:

### Boodschappen

- Budget: €600
- Spent: €420
- Remaining: €180
- Average: €575/month

### Elektriciteit

- Budget: €180
- Spent: €165
- Average: €171/month

---

## Budget Alerts

Generate alerts when:

- Category reaches 80% of budget
- Category exceeds budget
- Forecast predicts budget overrun
- Spending significantly exceeds historical average

Example:

> Grocery spending is projected to exceed budget by €75 this month.

---

# Feature 2: Savings & Available Money

## Monthly Cash Position

Calculate:

```text
Total Income
- Total Expenses
= Remaining Money
```

This should update continuously throughout the month.

---

## Available To Save

Display:

### This Month

How much money remains if no more spending occurs. (Remaining money)

Example:

```text
Income: €4,200
Expenses: €2,900
Remaining: €1,300
```

---

## Savings Goal Structure

Example:

```json
{
  "name": "New TV",
  "targetAmount": 1500,
  "reservedAmount": 700
}
```

---

## Goal Tracking

For every goal show:

- Target amount
- Reserved amount
- Remaining amount
- Percentage completed

Example:

```text
New TV

Target: €1,500
Reserved: €700
Remaining: €800
Progress: 46%
```

---

## Available Spendable Money

Calculate:

```text
Remaining Monthly Money
- Reserved Money
= Available Spendable Money
```

This answers:

> If I spend nothing else this month, how much money can I actually use?

---

# Feature 3: Transaction Categorization

## Goal

Each imported transaction should be assigned to a category.

Examples:

| Transaction Description | Category |
|------------------------|----------|
| Albert Heijn | Groceries |
| Jumbo | Groceries |
| Netflix | Entertainment |
| Rabobank Mortgage | Mortgage |
| Essent | Electricity |

---

## Learning Rules

The application should learn categorization rules.

Example:

```text
Albert Heijn
→ Groceries
```

Future Albert Heijn transactions should automatically be categorized as Groceries.

---

## Rule-Based Categorization

A rule contains:

- Merchant name
- Keywords
- Category

Example:

```json
{
  "merchant": "Albert Heijn",
  "category": "Groceries"
}
```

---

## Manual Corrections

Users should be able to:

- Change category
- Create new categories
- Delete categories
- Create new rule's to automatically categorize future transactions
- Apply corrections to all categorizations

Example:

```text
Action:
Move transaction to "Household"

Prompt:
Apply to future transactions?

Yes / No
```

## Recurring Transaction Detection

The system should identify recurring transactions.

Examples:

- Mortgage
- Electricity
- Insurance
- Internet
- Netflix

Display:

```text
Recurring expense detected

Netflix
€17.99/month
```

Already make it possible to then map these recurring transactions to a category and create a rule for them.

---

# Dashboard Pages

## Page 1: Overview

Purpose:

Provide a complete financial snapshot.

### KPIs

- Income This Month
- Expenses This Month
- Remaining Money
- Available Spendable Money (So without any of the budgets)

### Quick Insights

Examples:

- Grocery spending is 12% below average.
- Electricity is projected to exceed budget.
- Mortgage paid successfully.
- You can safely reserve another €300 this month.

---

## Page 2: Budgets

Show all budgets.

Per category:

- 1 Budget
- Actual Spend
- Remaining

### Nice to have, not for MVP
- Forecast
- Historical Average

---

## Page 3: Transactions

Features:

- Search
- Filter
- Edit Category
- Bulk Categorization
- Rule Management

Columns:

- Date
- Description
- Amount
- Category
- Account
- Confidence

---

# Home Assistant Requirements

## Deployment

The application must run as:

- Home Assistant panel
- Home Assistant dashboard card
- Self-hosted container

---

## Authentication

Use Home Assistant authentication.

No separate login system required.

---

## Theme Support

Inherit Home Assistant themes:

- Light mode
- Dark mode

---

## Responsive Design

Support:

- Desktop
- Tablet
- Mobile

---

# Technical Requirements

## TechStack

The techstack should be easy, fast, and maintainable.
For this we can use 

- React
- NestJS
- PostgreSQL/SQLite
- TypeScript
- Home Assistant compatible
- Responsive UI


## Storage

Simple storage solution, for example: SQLite.

Store:

- Categories
- Categorization rules
- Budgets

## Able to edit

- User can edit budgets, categories, and rules.

---

# Success Criteria

The dashboard is successful when a user can answer the following questions in less than 30 seconds:

1. How much money do I have left this month?
2. Am I within budget?
3. What do I usually spend per category?
4. How much money is reserved for future purchases?
5. Can I afford a planned purchase?
6. Which expenses are recurring?
7. Are all transactions categorized correctly?
8. Which categories are responsible for overspending?
9. The application is written in Dutch.
10. A rabobank transaction export can be imported and categorized automatically.