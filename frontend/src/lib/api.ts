const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('token');
    }

    setToken(token: string) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
        }
    }

    clearToken() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
        }
    }

    // Helper method to get authorization headers for use in other components
    // Use this instead of directly accessing localStorage
    getAuthHeaders(): HeadersInit {
        return this.getHeaders();
    }

    // Get the API URL for use in other components
    getApiUrl(): string {
        return API_URL;
    }

    // Generic HTTP methods
    async get(endpoint: string) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error: any = new Error(errorData.error || `Request failed: ${response.status}`);
            error.response = { data: errorData, status: response.status };
            throw error;
        }

        const data = await response.json();
        return { data };
    }

    async post(endpoint: string, body: any) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error: any = new Error(errorData.error || `Request failed: ${response.status}`);
            error.response = { data: errorData, status: response.status };
            throw error;
        }

        const data = await response.json();
        return { data };
    }

    // Auth
    private async authRequest(endpoint: string, body: Record<string, string>) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            let errorMessage = `Error de autenticación (${response.status})`;
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } else {
                    const textError = await response.text();
                    errorMessage = textError || errorMessage;
                }
            } catch (parseError) {
                // Use default message
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        this.setToken(data.token);
        return data;
    }

    async login(email: string, password: string) {
        return this.authRequest('/auth/login', { email, password });
    }

    async register(email: string, password: string, name: string) {
        return this.authRequest('/auth/register', { email, password, name });
    }

    async getMe() {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            let errorMessage = 'No se pudo obtener información del usuario';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                }
            } catch (parseError) {
                // Ignore parse errors, use default message
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // Transactions
    async getTransactions(params?: {
        type?: string;
        categoryId?: string;
        accountId?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }) {
        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    queryParams.append(key, value.toString());
                }
            });
        }

        const response = await fetch(
            `${API_URL}/transactions?${queryParams.toString()}`,
            {
                headers: this.getHeaders(),
            }
        );

        if (!response.ok) {
            throw new Error('Failed to get transactions');
        }

        return response.json();
    }

    async getTransactionStats(params?: { startDate?: string; endDate?: string; accountId?: string }) {
        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    queryParams.append(key, value.toString());
                }
            });
        }

        const response = await fetch(
            `${API_URL}/transactions/stats?${queryParams.toString()}`,
            {
                headers: this.getHeaders(),
            }
        );

        if (!response.ok) {
            throw new Error('Failed to get transaction stats');
        }

        return response.json();
    }

    async getCreditCards() {
        const response = await fetch(`${API_URL}/credit-cards`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to get credit cards');
        }

        return response.json();
    }

    async createTransaction(data: {
        type: string;
        amount: number;
        categoryId: string;
        description: string;
        date: string;
        isRecurring?: boolean;
        recurringPattern?: any;
        metadata?: any;
        creditCardId?: string;
        accountId?: string;
    }) {
        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to create transaction');
        }

        return response.json();
    }

    async updateTransaction(id: string, data: any) {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to update transaction');
        }

        return response.json();
    }

    async deleteTransaction(id: string) {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to delete transaction');
        }
    }

    // Categories
    async getCategories(type?: string) {
        const queryParams = type ? `?type=${type}` : '';
        const response = await fetch(`${API_URL}/categories${queryParams}`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to get categories');
        }

        return response.json();
    }

    async createCategory(data: {
        name: string;
        type: string;
        color: string;
        icon: string;
    }) {
        const response = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to create category');
        }

        return response.json();
    }

    // Categorization Rules
    async getCategorizationRules() {
        const response = await fetch(`${API_URL}/categorization-rules`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get rules');
        return response.json();
    }

    async createCategorizationRule(data: { categoryId: string; pattern: string; matchType: string; priority?: number }) {
        const response = await fetch(`${API_URL}/categorization-rules`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create rule');
        return response.json();
    }

    async updateCategorizationRule(id: string, data: any) {
        const response = await fetch(`${API_URL}/categorization-rules/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update rule');
        return response.json();
    }

    async deleteCategorizationRule(id: string) {
        const response = await fetch(`${API_URL}/categorization-rules/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete rule');
    }

    async suggestCategory(description: string, type?: string) {
        const response = await fetch(`${API_URL}/categorization-rules/suggest`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ description, ...(type && { type }) }),
        });
        if (!response.ok) throw new Error('Failed to suggest category');
        return response.json();
    }

    // Bulk transactions
    async bulkCreateTransactions(transactions: any[]) {
        const response = await fetch(`${API_URL}/transactions/bulk`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ transactions }),
        });
        if (!response.ok) throw new Error('Failed to bulk create transactions');
        return response.json();
    }

    // Debts
    async getDebts() {
        const response = await fetch(`${API_URL}/debts`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get debts');
        return response.json();
    }

    // Forecast
    async getForecast() {
        const response = await fetch(`${API_URL}/analytics/forecast`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get forecast');
        return response.json();
    }

    // Accounts
    async getAccounts() {
        const response = await fetch(`${API_URL}/accounts`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get accounts');
        return response.json();
    }

    async createAccount(data: any) {
        const response = await fetch(`${API_URL}/accounts`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create account');
        return response.json();
    }

    async updateAccount(id: string, data: any) {
        const response = await fetch(`${API_URL}/accounts/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update account');
        return response.json();
    }

    async deleteAccount(id: string) {
        const response = await fetch(`${API_URL}/accounts/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete account');
    }

    // Balance
    async getBalance() {
        const response = await fetch(`${API_URL}/balance`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get balance');
        return response.json();
    }

    // Budgets
    async getBudgets() {
        const response = await fetch(`${API_URL}/budgets`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get budgets');
        return response.json();
    }

    async getBudgetProgress() {
        const response = await fetch(`${API_URL}/budgets/progress`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get budget progress');
        return response.json();
    }

    async createBudget(data: any) {
        const response = await fetch(`${API_URL}/budgets`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create budget');
        return response.json();
    }

    async deleteBudget(id: string) {
        const response = await fetch(`${API_URL}/budgets/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete budget');
    }

    // Checklist
    async getChecklistItems(month?: number, year?: number) {
        const params = new URLSearchParams();
        if (month !== undefined) params.append('month', month.toString());
        if (year !== undefined) params.append('year', year.toString());
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${API_URL}/checklist${query}`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get checklist items');
        return response.json();
    }

    async createChecklistItem(data: any) {
        const response = await fetch(`${API_URL}/checklist`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create checklist item');
        return response.json();
    }

    async updateChecklistItem(id: string, data: any) {
        const response = await fetch(`${API_URL}/checklist/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update checklist item');
        return response.json();
    }

    async toggleChecklistItem(id: string, month: number, year: number) {
        const params = new URLSearchParams({ month: month.toString(), year: year.toString() });
        const response = await fetch(`${API_URL}/checklist/${id}/toggle?${params.toString()}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to toggle checklist item');
        return response.json();
    }

    async deleteChecklistItem(id: string, month?: number, year?: number) {
        const params = new URLSearchParams();
        if (month !== undefined) params.append('month', month.toString());
        if (year !== undefined) params.append('year', year.toString());
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${API_URL}/checklist/${id}${query}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete checklist item');
    }

    // Credit Cards (getCreditCards already exists above)
    async getCreditCardsSummary() {
        const response = await fetch(`${API_URL}/credit-cards/summary`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get credit cards summary');
        return response.json();
    }

    async createCreditCard(data: any) {
        const response = await fetch(`${API_URL}/credit-cards`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create credit card');
        return response.json();
    }

    async deleteCreditCard(id: string) {
        const response = await fetch(`${API_URL}/credit-cards/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete credit card');
    }

    async addCreditCardTransaction(cardId: string, data: any) {
        const response = await fetch(`${API_URL}/credit-cards/${cardId}/transactions`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to add credit card transaction');
        return response.json();
    }

    async addCreditCardPayment(cardId: string, data: any) {
        const response = await fetch(`${API_URL}/credit-cards/${cardId}/payments`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to add credit card payment');
        return response.json();
    }

    // Debts (getDebts already exists above)
    async createDebt(data: any) {
        const response = await fetch(`${API_URL}/debts`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create debt');
        return response.json();
    }

    async updateDebt(id: string, data: any) {
        const response = await fetch(`${API_URL}/debts/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update debt');
        return response.json();
    }

    async payDebt(id: string, data: any) {
        const response = await fetch(`${API_URL}/debts/${id}/pay`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to pay debt');
        return response.json();
    }

    async deleteDebt(id: string) {
        const response = await fetch(`${API_URL}/debts/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete debt');
    }

    // Goals
    async getGoals() {
        const response = await fetch(`${API_URL}/goals`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get goals');
        return response.json();
    }

    async createGoal(data: any) {
        const response = await fetch(`${API_URL}/goals`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create goal');
        return response.json();
    }

    async contributeToGoal(id: string, data: any) {
        const response = await fetch(`${API_URL}/goals/${id}/contribute`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to contribute to goal');
        return response.json();
    }

    async deleteGoal(id: string) {
        const response = await fetch(`${API_URL}/goals/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete goal');
    }

    // Savings
    async getSavings() {
        const response = await fetch(`${API_URL}/savings`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get savings');
        return response.json();
    }

    async createSaving(data: any) {
        const response = await fetch(`${API_URL}/savings`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create saving');
        return response.json();
    }

    async updateSaving(id: string, data: any) {
        const response = await fetch(`${API_URL}/savings/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update saving');
        return response.json();
    }

    async deleteSaving(id: string) {
        const response = await fetch(`${API_URL}/savings/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete saving');
    }

    async withdrawFromSaving(id: string, data: any) {
        const response = await fetch(`${API_URL}/savings/${id}/withdraw`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to withdraw from saving');
        return response.json();
    }

    // Reminders
    async getReminders() {
        const response = await fetch(`${API_URL}/reminders`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get reminders');
        return response.json();
    }

    async createReminder(data: any) {
        const response = await fetch(`${API_URL}/reminders`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create reminder');
        return response.json();
    }

    async markReminderPaid(id: string) {
        const response = await fetch(`${API_URL}/reminders/${id}/mark-paid`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to mark reminder as paid');
        return response.json();
    }

    async deleteReminder(id: string) {
        const response = await fetch(`${API_URL}/reminders/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete reminder');
    }

    // Recurring Transactions
    async getRecurringTransactions() {
        const response = await fetch(`${API_URL}/recurring`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get recurring transactions');
        return response.json();
    }

    async createRecurringTransaction(data: any) {
        const response = await fetch(`${API_URL}/recurring`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create recurring transaction');
        return response.json();
    }

    async updateRecurringTransaction(id: string, data: any) {
        const response = await fetch(`${API_URL}/recurring/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update recurring transaction');
        return response.json();
    }

    async deleteRecurringTransaction(id: string) {
        const response = await fetch(`${API_URL}/recurring/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete recurring transaction');
    }

    async executeRecurringTransaction(id: string) {
        const response = await fetch(`${API_URL}/recurring/${id}/execute`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to execute recurring transaction');
        return response.json();
    }

    async getPendingRecurring() {
        const response = await fetch(`${API_URL}/recurring/pending`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get pending recurring');
        return response.json();
    }

    async executeAllPending() {
        const response = await fetch(`${API_URL}/recurring/execute-all`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to execute all pending');
        return response.json();
    }

    // Transfers
    async getAccountsForTransfer() {
        const response = await fetch(`${API_URL}/transfers/accounts`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get accounts for transfer');
        return response.json();
    }

    async getTransfers() {
        const response = await fetch(`${API_URL}/transfers`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get transfers');
        return response.json();
    }

    async createTransfer(data: any) {
        const response = await fetch(`${API_URL}/transfers`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create transfer');
        return response.json();
    }

    async deleteTransfer(id: string) {
        const response = await fetch(`${API_URL}/transfers/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete transfer');
    }

    // Analytics (getForecast already exists above)
    async getDashboardStats() {
        const response = await fetch(`${API_URL}/analytics/dashboard`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get dashboard stats');
        return response.json();
    }

    async getFinancialReport(months?: number) {
        const query = months ? `?months=${months}` : '';
        const response = await fetch(`${API_URL}/analytics/report${query}`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get financial report');
        return response.json();
    }

    async getAnalyticsOverview() {
        const response = await fetch(`${API_URL}/analytics/overview`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get analytics overview');
        return response.json();
    }

    async getCategoryBreakdown(params?: { type?: string }) {
        const query = params?.type ? `?type=${params.type}` : '';
        const response = await fetch(`${API_URL}/analytics/categories${query}`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get category breakdown');
        return response.json();
    }

    async getTopCategories(params?: { limit?: number; type?: string }) {
        const queryParams = new URLSearchParams();
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.type) queryParams.append('type', params.type);
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const response = await fetch(`${API_URL}/analytics/top-categories${query}`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get top categories');
        return response.json();
    }

    // Notifications
    async runNotificationChecks() {
        const response = await fetch(`${API_URL}/notifications/run-checks`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to run notification checks');
        return response.json();
    }
}

export const api = new ApiClient();
