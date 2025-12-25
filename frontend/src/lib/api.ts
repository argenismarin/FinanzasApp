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

    // Auth
    async login(email: string, password?: string, name?: string) {
        try {
            const body: any = { email };
            if (password) body.password = password;
            if (name) body.name = name;

            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                // Try to parse as JSON, fallback to text if it fails
                let errorMessage = `Error al iniciar sesión (${response.status})`;
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorData.message || errorMessage;
                        console.error('Login error (JSON):', errorData);
                    } else {
                        const textError = await response.text();
                        errorMessage = textError || errorMessage;
                        console.error('Login error (Text):', textError);
                    }
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            this.setToken(data.token);
            return data;
        } catch (error) {
            console.error('Login exception:', error);
            throw error;
        }
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

    async getTransactionStats(params?: { startDate?: string; endDate?: string }) {
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

    async createTransaction(data: {
        type: string;
        amount: number;
        categoryId: string;
        description: string;
        date: string;
        isRecurring?: boolean;
        recurringPattern?: any;
        metadata?: any;
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
}

export const api = new ApiClient();
