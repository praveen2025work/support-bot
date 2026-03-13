import { NextRequest, NextResponse } from 'next/server';

// ── Mocks (must be declared before imports that use them) ────────────────────

// Mock admin-auth: we control whether the caller is admin or not
const mockIsRequestAdmin = jest.fn<Promise<{ isAdmin: boolean }>, [Request]>();
jest.mock('@/lib/admin-auth', () => ({
  isRequestAdmin: (...args: [Request]) => mockIsRequestAdmin(...args),
}));

// Mock fs so we never touch the real filesystem
const mockReaddirSync = jest.fn();
const mockStatSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockUnlinkSync = jest.fn();
jest.mock('fs', () => ({
  readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
  statSync: (...args: unknown[]) => mockStatSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
}));

// Import route handlers AFTER mocks are set up
import { GET, POST, DELETE } from '@/app/api/admin/files/route';
import { GET as ReadGET } from '@/app/api/admin/files/read/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockRequest(
  method: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const url = new URL('http://localhost:3001/api/admin/files');
  if (options.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const init: RequestInit = {
    method,
    headers: new Headers(options.headers || {}),
  };
  if (options.body) {
    init.body = JSON.stringify(options.body);
    (init.headers as Headers).set('content-type', 'application/json');
  }

  return new NextRequest(url, init);
}

async function parseJson(response: NextResponse): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = await response.json();
  return { status: response.status, body };
}

// ── Test suites ──────────────────────────────────────────────────────────────

describe('Admin Files API — auth enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET returns 403 when user is not admin', async () => {
    mockIsRequestAdmin.mockResolvedValue({ isAdmin: false });
    const req = createMockRequest('GET');
    const res = await GET(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(403);
    expect(body.error).toMatch(/admin/i);
  });

  test('POST returns 403 when user is not admin', async () => {
    mockIsRequestAdmin.mockResolvedValue({ isAdmin: false });
    const req = createMockRequest('POST', { body: { name: 'test.txt', content: 'hi' } });
    const res = await POST(req);
    const { status } = await parseJson(res);

    expect(status).toBe(403);
  });

  test('DELETE returns 403 when user is not admin', async () => {
    mockIsRequestAdmin.mockResolvedValue({ isAdmin: false });
    const req = createMockRequest('DELETE', { searchParams: { name: 'test.txt' } });
    const res = await DELETE(req);
    const { status } = await parseJson(res);

    expect(status).toBe(403);
  });
});

describe('Admin Files API — path traversal protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRequestAdmin.mockResolvedValue({ isAdmin: true });
    mockWriteFileSync.mockImplementation(() => {});
    mockUnlinkSync.mockImplementation(() => {});
    mockReadFileSync.mockReturnValue('file content');
  });

  test('POST sanitizes slashes in filenames so traversal paths stay inside DATA_DIR', async () => {
    const req = createMockRequest('POST', {
      body: { name: '../../etc/passwd', content: 'malicious' },
    });
    const res = await POST(req);
    const { status, body } = await parseJson(res);

    // Slashes are replaced with hyphens by the regex sanitizer, so the
    // resolved path stays inside DATA_DIR. The name will contain ".." but
    // the path.resolve guard ensures no directory escape.
    expect(status).toBe(200);
    // Verify slashes were stripped (no directory separators remain)
    expect(body.name).not.toContain('/');
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    // The written path must be inside the data/knowledge directory
    const writtenPath = mockWriteFileSync.mock.calls[0][0] as string;
    expect(writtenPath).toContain('data/knowledge');
  });

  test('DELETE sanitizes slashes in filenames so traversal paths stay inside DATA_DIR', async () => {
    mockUnlinkSync.mockImplementation(() => {});
    const req = createMockRequest('DELETE', {
      searchParams: { name: '../../../etc/shadow' },
    });
    const res = await DELETE(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(200);
    expect(body.deleted).not.toContain('/');
    // The unlinked path must be inside the data/knowledge directory
    const deletedPath = mockUnlinkSync.mock.calls[0][0] as string;
    expect(deletedPath).toContain('data/knowledge');
  });

  test('File read sanitizes slashes in filenames so traversal paths stay inside DATA_DIR', async () => {
    mockReadFileSync.mockReturnValue('file content');
    const req = createMockRequest('GET', {
      searchParams: { name: '../../secrets.env' },
    });
    const res = await ReadGET(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(200);
    expect(body.name).not.toContain('/');
  });
});

describe('Admin Files API — GET (list files)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRequestAdmin.mockResolvedValue({ isAdmin: true });
  });

  test('returns a list of files with metadata', async () => {
    mockReaddirSync.mockReturnValue(['report.csv', 'faq.txt']);
    mockStatSync.mockReturnValue({
      size: 1024,
      mtime: new Date('2025-01-15T10:00:00Z'),
    });
    mockReadFileSync.mockReturnValue('Hello world content that is returned');

    const req = createMockRequest('GET');
    const res = await GET(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(200);
    expect(body.totalFiles).toBe(2);
    expect(Array.isArray(body.files)).toBe(true);

    const files = body.files as Array<Record<string, unknown>>;
    expect(files[0]).toHaveProperty('name');
    expect(files[0]).toHaveProperty('size', 1024);
    expect(files[0]).toHaveProperty('extension');
    expect(files[0]).toHaveProperty('modifiedAt');
    expect(files[0]).toHaveProperty('preview');
  });

  test('filters out hidden files (dotfiles)', async () => {
    mockReaddirSync.mockReturnValue(['.hidden', 'visible.txt']);
    mockStatSync.mockReturnValue({ size: 100, mtime: new Date() });
    mockReadFileSync.mockReturnValue('content');

    const req = createMockRequest('GET');
    const res = await GET(req);
    const { body } = await parseJson(res);

    expect(body.totalFiles).toBe(1);
    const files = body.files as Array<Record<string, unknown>>;
    expect(files[0].name).toBe('visible.txt');
  });
});

describe('Admin Files API — POST (create/update file)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRequestAdmin.mockResolvedValue({ isAdmin: true });
    mockWriteFileSync.mockImplementation(() => {});
  });

  test('creates a file with valid name and content', async () => {
    const req = createMockRequest('POST', {
      body: { name: 'new-doc.txt', content: 'Hello, world!' },
    });
    const res = await POST(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.name).toBe('new-doc.txt');
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
  });

  test('returns 400 when name is missing', async () => {
    const req = createMockRequest('POST', {
      body: { content: 'some content' },
    });
    const res = await POST(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/name/i);
  });

  test('returns 400 when content is missing', async () => {
    const req = createMockRequest('POST', {
      body: { name: 'test.txt' },
    });
    const res = await POST(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/content/i);
  });

  test('sanitizes special characters in filename', async () => {
    const req = createMockRequest('POST', {
      body: { name: 'bad file@name!.txt', content: 'ok' },
    });
    const res = await POST(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(200);
    // Special chars replaced with hyphens
    expect(body.name).toBe('bad-file-name-.txt');
  });
});

describe('Admin Files API — DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRequestAdmin.mockResolvedValue({ isAdmin: true });
    mockUnlinkSync.mockImplementation(() => {});
  });

  test('deletes a file by name', async () => {
    const req = createMockRequest('DELETE', {
      searchParams: { name: 'old-file.txt' },
    });
    const res = await DELETE(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.deleted).toBe('old-file.txt');
    expect(mockUnlinkSync).toHaveBeenCalledTimes(1);
  });

  test('returns 400 when name param is missing', async () => {
    const req = createMockRequest('DELETE');
    const res = await DELETE(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/name/i);
  });
});

describe('Admin Files API — file read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRequestAdmin.mockResolvedValue({ isAdmin: true });
  });

  test('returns file content for a valid file', async () => {
    mockReadFileSync.mockReturnValue('This is the file content');
    const req = createMockRequest('GET', {
      searchParams: { name: 'knowledge.txt' },
    });
    const res = await ReadGET(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(200);
    expect(body.name).toBe('knowledge.txt');
    expect(body.content).toBe('This is the file content');
  });

  test('returns 400 when name param is missing', async () => {
    const req = createMockRequest('GET');
    const res = await ReadGET(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/name/i);
  });

  test('returns 500 when file does not exist (readFileSync throws)', async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });
    const req = createMockRequest('GET', {
      searchParams: { name: 'missing.txt' },
    });
    const res = await ReadGET(req);
    const { status, body } = await parseJson(res);

    expect(status).toBe(500);
    expect(body.error).toBeDefined();
  });

  test('returns 403 for file read when user is not admin', async () => {
    mockIsRequestAdmin.mockResolvedValue({ isAdmin: false });
    const req = createMockRequest('GET', {
      searchParams: { name: 'secret.txt' },
    });
    const res = await ReadGET(req);
    const { status } = await parseJson(res);

    expect(status).toBe(403);
  });
});
