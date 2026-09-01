-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: categories
create table public.categories (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    type text check (type in ('Income', 'Expense')) not null,
    icon text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: transactions
create table public.transactions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    category_id uuid references public.categories(id) on delete cascade not null,
    type text check (type in ('Income', 'Expense')) not null,
    amount numeric(15,2) not null,
    description text,
    transaction_date date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: budgets
create table public.budgets (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    category_id uuid references public.categories(id) on delete cascade not null,
    amount numeric(15,2) not null,
    month integer not null check (month between 1 and 12),
    year integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, category_id, month, year)
);

-- Table: financial_goals
create table public.financial_goals (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    target_amount numeric(15,2) not null,
    current_amount numeric(15,2) default 0 not null,
    deadline date,
    status text check (status in ('Active', 'Completed', 'Cancelled')) default 'Active' not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.financial_goals enable row level security;

-- Policies for categories
create policy "Users can view their own categories" on categories for select using (auth.uid() = user_id);
create policy "Users can insert their own categories" on categories for insert with check (auth.uid() = user_id);
create policy "Users can update their own categories" on categories for update using (auth.uid() = user_id);
create policy "Users can delete their own categories" on categories for delete using (auth.uid() = user_id);

-- Policies for transactions
create policy "Users can view their own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Users can insert their own transactions" on transactions for insert with check (auth.uid() = user_id);
create policy "Users can update their own transactions" on transactions for update using (auth.uid() = user_id);
create policy "Users can delete their own transactions" on transactions for delete using (auth.uid() = user_id);

-- Policies for budgets
create policy "Users can view their own budgets" on budgets for select using (auth.uid() = user_id);
create policy "Users can insert their own budgets" on budgets for insert with check (auth.uid() = user_id);
create policy "Users can update their own budgets" on budgets for update using (auth.uid() = user_id);
create policy "Users can delete their own budgets" on budgets for delete using (auth.uid() = user_id);

-- Policies for financial_goals
create policy "Users can view their own goals" on financial_goals for select using (auth.uid() = user_id);
create policy "Users can insert their own goals" on financial_goals for insert with check (auth.uid() = user_id);
create policy "Users can update their own goals" on financial_goals for update using (auth.uid() = user_id);
create policy "Users can delete their own goals" on financial_goals for delete using (auth.uid() = user_id);
