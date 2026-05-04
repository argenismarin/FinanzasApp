import { extractErrorMessage } from './errorMessages';

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

    // Helper para que componentes externos no toquen localStorage directamente
    getAuthHeaders(): HeadersInit {
        return this.getHeaders();
    }

    getApiUrl(): string {
        return API_URL;
    }

    // Helper interno: lanza Error en español si la respuesta no es ok
    private async ensureOk(response: Response, fallback: string): Promise<void> {
        if (!response.ok) {
            const message = await extractErrorMessage(response, fallback);
            const error: any = new Error(message);
            error.status = response.status;
            throw error;
        }
    }

    // Métodos HTTP genéricos
    async get(endpoint: string) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo obtener la información');
        const data = await response.json();
        return { data };
    }

    async post(endpoint: string, body: any) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });
        await this.ensureOk(response, 'No se pudo completar la operación');
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
            const message = await extractErrorMessage(response, 'No se pudo iniciar sesión');
            throw new Error(message);
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
        await this.ensureOk(response, 'No se pudo obtener tu información de usuario');
        return response.json();
    }

    // Transactions
    async getTransactions(params?: {
        type?: string;
        categoryId?: string;
        accountId?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
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
            { headers: this.getHeaders() }
        );
        await this.ensureOk(response, 'No se pudieron cargar las transacciones');
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
            { headers: this.getHeaders() }
        );
        await this.ensureOk(response, 'No se pudieron cargar las estadísticas');
        return response.json();
    }

    async getCreditCards() {
        const response = await fetch(`${API_URL}/credit-cards`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las tarjetas de crédito');
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
        await this.ensureOk(response, 'No se pudo crear la transacción');
        return response.json();
    }

    async updateTransaction(id: string, data: any) {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar la transacción');
        return response.json();
    }

    async deleteTransaction(id: string) {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar la transacción');
    }

    // Categories
    async getCategories(type?: string) {
        const queryParams = type ? `?type=${type}` : '';
        const response = await fetch(`${API_URL}/categories${queryParams}`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las categorías');
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
        await this.ensureOk(response, 'No se pudo crear la categoría');
        return response.json();
    }

    // Categorization Rules
    async getCategorizationRules() {
        const response = await fetch(`${API_URL}/categorization-rules`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las reglas');
        return response.json();
    }

    async createCategorizationRule(data: { categoryId: string; pattern: string; matchType: string; priority?: number }) {
        const response = await fetch(`${API_URL}/categorization-rules`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear la regla');
        return response.json();
    }

    async updateCategorizationRule(id: string, data: any) {
        const response = await fetch(`${API_URL}/categorization-rules/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar la regla');
        return response.json();
    }

    async deleteCategorizationRule(id: string) {
        const response = await fetch(`${API_URL}/categorization-rules/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar la regla');
    }

    async suggestCategory(description: string, type?: string) {
        const response = await fetch(`${API_URL}/categorization-rules/suggest`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ description, ...(type && { type }) }),
        });
        await this.ensureOk(response, 'No se pudo sugerir categoría');
        return response.json();
    }

    // Bulk transactions
    async bulkCreateTransactions(transactions: any[]) {
        const response = await fetch(`${API_URL}/transactions/bulk`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ transactions }),
        });
        await this.ensureOk(response, 'No se pudieron importar las transacciones');
        return response.json();
    }

    // Debts
    async getDebts() {
        const response = await fetch(`${API_URL}/debts`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las deudas');
        return response.json();
    }

    // Forecast
    async getForecast() {
        const response = await fetch(`${API_URL}/analytics/forecast`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo obtener el pronóstico');
        return response.json();
    }

    // Accounts
    async getAccounts() {
        const response = await fetch(`${API_URL}/accounts`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las cuentas');
        return response.json();
    }

    async createAccount(data: any) {
        const response = await fetch(`${API_URL}/accounts`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear la cuenta');
        return response.json();
    }

    async updateAccount(id: string, data: any) {
        const response = await fetch(`${API_URL}/accounts/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar la cuenta');
        return response.json();
    }

    async deleteAccount(id: string) {
        const response = await fetch(`${API_URL}/accounts/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar la cuenta');
    }

    // Balance
    async getBalance() {
        const response = await fetch(`${API_URL}/balance`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo obtener el balance');
        return response.json();
    }

    async recalculateBalances(userId?: string) {
        const query = userId ? `?userId=${userId}` : '';
        const response = await fetch(`${API_URL}/balance/recalculate${query}`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron recalcular los saldos');
        return response.json();
    }

    // Budgets
    async getBudgets() {
        const response = await fetch(`${API_URL}/budgets`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar los presupuestos');
        return response.json();
    }

    async getBudgetProgress() {
        const response = await fetch(`${API_URL}/budgets/progress`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo obtener el progreso del presupuesto');
        return response.json();
    }

    async createBudget(data: any) {
        const response = await fetch(`${API_URL}/budgets`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear el presupuesto');
        return response.json();
    }

    async updateBudget(id: string, data: any) {
        const response = await fetch(`${API_URL}/budgets/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar el presupuesto');
        return response.json();
    }

    async deleteBudget(id: string) {
        const response = await fetch(`${API_URL}/budgets/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar el presupuesto');
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
        await this.ensureOk(response, 'No se pudo cargar el checklist');
        return response.json();
    }

    async createChecklistItem(data: any) {
        const response = await fetch(`${API_URL}/checklist`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear el item');
        return response.json();
    }

    async updateChecklistItem(id: string, data: any) {
        const response = await fetch(`${API_URL}/checklist/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar el item');
        return response.json();
    }

    async toggleChecklistItem(id: string, month: number, year: number) {
        const params = new URLSearchParams({ month: month.toString(), year: year.toString() });
        const response = await fetch(`${API_URL}/checklist/${id}/toggle?${params.toString()}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo marcar el item');
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
        await this.ensureOk(response, 'No se pudo eliminar el item');
    }

    // Credit Cards
    async getCreditCardsSummary() {
        const response = await fetch(`${API_URL}/credit-cards/summary`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo obtener el resumen de tarjetas');
        return response.json();
    }

    async createCreditCard(data: any) {
        const response = await fetch(`${API_URL}/credit-cards`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear la tarjeta');
        return response.json();
    }

    async deleteCreditCard(id: string) {
        const response = await fetch(`${API_URL}/credit-cards/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar la tarjeta');
    }

    async addCreditCardTransaction(cardId: string, data: any) {
        const response = await fetch(`${API_URL}/credit-cards/${cardId}/transactions`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo agregar la transacción');
        return response.json();
    }

    async updateCreditCardTransaction(cardId: string, transactionId: string, data: any) {
        const response = await fetch(`${API_URL}/credit-cards/${cardId}/transactions/${transactionId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar la transacción');
        return response.json();
    }

    async deleteCreditCardTransaction(cardId: string, transactionId: string) {
        const response = await fetch(`${API_URL}/credit-cards/${cardId}/transactions/${transactionId}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar la transacción');
    }

    async addCreditCardPayment(cardId: string, data: any) {
        const response = await fetch(`${API_URL}/credit-cards/${cardId}/payments`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo registrar el pago');
        return response.json();
    }

    // Debts
    async createDebt(data: any) {
        const response = await fetch(`${API_URL}/debts`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear la deuda');
        return response.json();
    }

    async updateDebt(id: string, data: any) {
        const response = await fetch(`${API_URL}/debts/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar la deuda');
        return response.json();
    }

    async payDebt(id: string, data: any) {
        const response = await fetch(`${API_URL}/debts/${id}/pay`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo registrar el pago de la deuda');
        return response.json();
    }

    async deleteDebt(id: string) {
        const response = await fetch(`${API_URL}/debts/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar la deuda');
    }

    // Goals
    async getGoals() {
        const response = await fetch(`${API_URL}/goals`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las metas');
        return response.json();
    }

    async createGoal(data: any) {
        const response = await fetch(`${API_URL}/goals`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear la meta');
        return response.json();
    }

    async contributeToGoal(id: string, data: any) {
        const response = await fetch(`${API_URL}/goals/${id}/contribute`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo registrar el aporte');
        return response.json();
    }

    async updateGoal(id: string, data: any) {
        const response = await fetch(`${API_URL}/goals/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar la meta');
        return response.json();
    }

    async deleteGoal(id: string) {
        const response = await fetch(`${API_URL}/goals/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar la meta');
    }

    // Savings
    async getSavings() {
        const response = await fetch(`${API_URL}/savings`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar los ahorros');
        return response.json();
    }

    async createSaving(data: any) {
        const response = await fetch(`${API_URL}/savings`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear el ahorro');
        return response.json();
    }

    async updateSaving(id: string, data: any) {
        const response = await fetch(`${API_URL}/savings/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar el ahorro');
        return response.json();
    }

    async deleteSaving(id: string) {
        const response = await fetch(`${API_URL}/savings/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar el ahorro');
    }

    async withdrawFromSaving(id: string, data: any) {
        const response = await fetch(`${API_URL}/savings/${id}/withdraw`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo realizar el retiro');
        return response.json();
    }

    // Reminders
    async getReminders() {
        const response = await fetch(`${API_URL}/reminders`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar los recordatorios');
        return response.json();
    }

    async createReminder(data: any) {
        const response = await fetch(`${API_URL}/reminders`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear el recordatorio');
        return response.json();
    }

    async markReminderPaid(id: string) {
        const response = await fetch(`${API_URL}/reminders/${id}/mark-paid`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo marcar como pagado');
        return response.json();
    }

    async updateReminder(id: string, data: any) {
        const response = await fetch(`${API_URL}/reminders/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar el recordatorio');
        return response.json();
    }

    async deleteReminder(id: string) {
        const response = await fetch(`${API_URL}/reminders/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar el recordatorio');
    }

    // Recurring Transactions
    async getRecurringTransactions() {
        const response = await fetch(`${API_URL}/recurring`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las transacciones recurrentes');
        return response.json();
    }

    async createRecurringTransaction(data: any) {
        const response = await fetch(`${API_URL}/recurring`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear la transacción recurrente');
        return response.json();
    }

    async updateRecurringTransaction(id: string, data: any) {
        const response = await fetch(`${API_URL}/recurring/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo actualizar la transacción recurrente');
        return response.json();
    }

    async deleteRecurringTransaction(id: string) {
        const response = await fetch(`${API_URL}/recurring/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar la transacción recurrente');
    }

    async executeRecurringTransaction(id: string) {
        const response = await fetch(`${API_URL}/recurring/${id}/execute`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo ejecutar la transacción recurrente');
        return response.json();
    }

    async getPendingRecurring() {
        const response = await fetch(`${API_URL}/recurring/pending`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las pendientes');
        return response.json();
    }

    async executeAllPending() {
        const response = await fetch(`${API_URL}/recurring/execute-all`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron ejecutar las pendientes');
        return response.json();
    }

    // Transfers
    async getAccountsForTransfer() {
        const response = await fetch(`${API_URL}/transfers/accounts`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las cuentas para transferir');
        return response.json();
    }

    async getTransfers() {
        const response = await fetch(`${API_URL}/transfers`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las transferencias');
        return response.json();
    }

    async createTransfer(data: any) {
        const response = await fetch(`${API_URL}/transfers`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        await this.ensureOk(response, 'No se pudo crear la transferencia');
        return response.json();
    }

    async deleteTransfer(id: string) {
        const response = await fetch(`${API_URL}/transfers/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo eliminar la transferencia');
    }

    // Analytics
    async getDashboardStats() {
        const response = await fetch(`${API_URL}/analytics/dashboard`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo cargar el dashboard');
        return response.json();
    }

    async getFinancialReport(months?: number) {
        const query = months ? `?months=${months}` : '';
        const response = await fetch(`${API_URL}/analytics/report${query}`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo obtener el reporte financiero');
        return response.json();
    }

    async getAnalyticsOverview() {
        const response = await fetch(`${API_URL}/analytics/overview`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo obtener el resumen de análisis');
        return response.json();
    }

    async getCategoryBreakdown(params?: { type?: string }) {
        const query = params?.type ? `?type=${params.type}` : '';
        const response = await fetch(`${API_URL}/analytics/categories${query}`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo obtener el desglose por categoría');
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
        await this.ensureOk(response, 'No se pudieron cargar las categorías principales');
        return response.json();
    }

    async getAdvancedAnalytics() {
        const response = await fetch(`${API_URL}/analytics/advanced`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron cargar las métricas avanzadas');
        return response.json();
    }

    // AI
    async askFinancialAdvice(question: string, includeContext: boolean = true) {
        const response = await fetch(`${API_URL}/ai/advice`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ question, includeContext }),
        });
        await this.ensureOk(response, 'No se pudo obtener consejo financiero');
        return response.json();
    }

    async analyzeSpending(months: number = 1) {
        const response = await fetch(`${API_URL}/ai/analyze-spending?months=${months}`, {
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudo analizar el gasto');
        return response.json();
    }

    async suggestBudget(monthlyIncome: number) {
        const response = await fetch(`${API_URL}/ai/suggest-budget`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ monthlyIncome }),
        });
        await this.ensureOk(response, 'No se pudo sugerir presupuesto');
        return response.json();
    }

    // Notifications
    async runNotificationChecks() {
        const response = await fetch(`${API_URL}/notifications/run-checks`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        await this.ensureOk(response, 'No se pudieron ejecutar las verificaciones');
        return response.json();
    }
}

export const api = new ApiClient();
