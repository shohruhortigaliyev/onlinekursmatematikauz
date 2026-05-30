const API_BASE = "";

function getAdminHeaders(adminKey) {
  const key = adminKey || localStorage.getItem("admin_key");
  return key ? { "x-admin-key": key } : {};
}

async function request(path, options = {}) {
  const opts = {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };
  const res = await fetch(API_BASE + path, opts);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const error = data && data.error ? data.error : res.statusText;
    throw new Error(error || "Request failed");
  }
  return data;
}

window.api = {
  async loginUser(login, pass) {
    try {
      return await request("/api/login", {
        method: "POST",
        body: JSON.stringify({ code: login, login, pass }),
      });
    } catch (error) {
      return { ok: false, error: error.message || "invalid" };
    }
  },

  async adminLogin(password) {
    try {
      return await request("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
    } catch (error) {
      return { ok: false, error: error.message || "invalid" };
    }
  },

  async getTests() {
    try {
      return await request("/api/tests");
    } catch (error) {
      return [];
    }
  },

  async createTest(test, adminKey) {
    return await request("/api/tests", {
      method: "POST",
      headers: getAdminHeaders(adminKey),
      body: JSON.stringify(test),
    });
  },

  async updateTest(test, adminKey) {
    return await request(`/api/tests/${encodeURIComponent(test.id)}`, {
      method: "PUT",
      headers: getAdminHeaders(adminKey),
      body: JSON.stringify(test),
    });
  },

  async deleteTest(id, adminKey) {
    return await request(`/api/tests/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getAdminHeaders(adminKey),
    });
  },

  async getUsers(adminKey) {
    try {
      return await request("/api/users", {
        headers: getAdminHeaders(adminKey),
      });
    } catch (error) {
      return [];
    }
  },

  async createUser(user, adminKey) {
    return await request("/api/users", {
      method: "POST",
      headers: getAdminHeaders(adminKey),
      body: JSON.stringify({
        code: user.login || user.code,
        login: user.login || user.code,
        pass: user.password || user.pass,
        password: user.password || user.pass,
        name: user.fullname,
        status: user.status,
      }),
    });
  },

  async updateUser(user, adminKey) {
    return await request(`/api/users/${encodeURIComponent(user.id)}`, {
      method: "PUT",
      headers: getAdminHeaders(adminKey),
      body: JSON.stringify({
        code: user.login || user.code,
        login: user.login || user.code,
        pass: user.password || user.pass,
        password: user.password || user.pass,
        name: user.fullname,
        status: user.status,
      }),
    });
  },

  async deleteUser(id, adminKey) {
    return await request(`/api/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getAdminHeaders(adminKey),
    });
  },

  async postResult(result) {
    try {
      return await request("/api/results", {
        method: "POST",
        body: JSON.stringify(result),
      });
    } catch (error) {
      return null;
    }
  },

  async getResults(adminKey) {
    try {
      return await request("/api/results", {
        headers: getAdminHeaders(adminKey),
      });
    } catch (error) {
      return [];
    }
  },
};
