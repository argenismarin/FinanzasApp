import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyError, extractErrorMessage } from '../errorMessages';

describe('friendlyError', () => {
    test('returns Spanish message for known status codes', () => {
        assert.match(friendlyError(401, 'fallback'), /[Ss]esión/);
        assert.match(friendlyError(403, 'fallback'), /[Pp]ermiso/);
        assert.match(friendlyError(404, 'fallback'), /encontró/);
        assert.match(friendlyError(429, 'fallback'), /[Dd]emasiadas/);
        assert.match(friendlyError(500, 'fallback'), /servidor/);
    });

    test('returns fallback for unknown status codes', () => {
        assert.equal(friendlyError(418, 'mi mensaje'), 'mi mensaje');
        assert.equal(friendlyError(999, 'fallback'), 'fallback');
    });

    test('default fallback when none provided', () => {
        assert.equal(friendlyError(418), 'Ocurrió un error inesperado.');
    });
});

describe('extractErrorMessage', () => {
    function makeResponse(status: number, body: any, contentType = 'application/json'): Response {
        return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
            status,
            headers: { 'content-type': contentType }
        });
    }

    test('uses backend Spanish message when present', async () => {
        const r = makeResponse(400, { error: 'Monto inválido. Debe ser un número positivo.' });
        const msg = await extractErrorMessage(r, 'fallback');
        assert.equal(msg, 'Monto inválido. Debe ser un número positivo.');
    });

    test('uses backend message field as alternative to error', async () => {
        const r = makeResponse(400, { message: 'Datos faltantes' });
        const msg = await extractErrorMessage(r, 'fallback');
        assert.equal(msg, 'Datos faltantes');
    });

    test('falls back to friendlyError when backend sends English generic', async () => {
        const r = makeResponse(500, { error: 'Failed to do something' });
        const msg = await extractErrorMessage(r, 'fallback');
        // Should NOT be "Failed to do something" — should be Spanish friendly message
        assert.notEqual(msg, 'Failed to do something');
        assert.match(msg, /servidor/);
    });

    test('falls back to friendlyError when backend sends "internal server error"', async () => {
        const r = makeResponse(500, { error: 'Internal Server Error' });
        const msg = await extractErrorMessage(r, 'fallback');
        assert.match(msg, /servidor/);
    });

    test('falls back to friendlyError when no JSON body', async () => {
        const r = makeResponse(503, '<html>error</html>', 'text/html');
        const msg = await extractErrorMessage(r, 'fallback custom');
        assert.match(msg, /[Ss]ervicio|servidor/);
    });

    test('uses fallback for unknown status without body', async () => {
        const r = makeResponse(418, '', 'text/plain');
        const msg = await extractErrorMessage(r, 'mi fallback');
        assert.equal(msg, 'mi fallback');
    });
});
