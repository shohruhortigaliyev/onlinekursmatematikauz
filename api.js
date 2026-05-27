/* Lightweight API wrapper with LocalStorage fallback */
(function () {
  "use strict";

  async function fetchJson(url, opts) {
    try {
      const res = await fetch(
        url,
        Object.assign({ credentials: "same-origin" }, opts || {}),
      );
      if (!res.ok) throw new Error("network");
      return await res.json();
    } catch (e) {
      throw e;
    }
  }

  // Fallback helpers using localStorage
  function readLocal(key, def) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(def || []));
    } catch (e) {
      return def || [];
    }
  }

  function writeLocal(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  window.api = {
    async getTests() {
      try {
        return await fetchJson("/api/tests");
      } catch (e) {
        return readLocal("public_tests", []);
      }
    },

    async postResult(result) {
      try {
        return await fetchJson("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        });
      } catch (e) {
        const arr = readLocal("results", []);
        arr.push(result);
        writeLocal("results", arr);
        return result;
      }
    },

    async loginUser(code, pass) {
      try {
        return await fetchJson("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, pass }),
        });
      } catch (e) {
        return null;
      }
    },

    async createUser(user, adminKey) {
      try {
        return await fetchJson("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminKey ? { "x-admin-key": adminKey } : {}),
          },
          body: JSON.stringify(user),
        });
      } catch (e) {
        const users = readLocal("users", []);
        users.push(user);
        writeLocal("users", users);
        return user;
      }
    },

    async updateUser(id, user, adminKey) {
      try {
        return await fetchJson(`/api/users/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(adminKey ? { "x-admin-key": adminKey } : {}),
          },
          body: JSON.stringify(user),
        });
      } catch (e) {
        const users = readLocal("users", []);
        const idx = users.findIndex((item) => String(item.id) === String(id));
        if (idx !== -1) {
          users[idx] = Object.assign({}, users[idx], user);
          writeLocal("users", users);
          return users[idx];
        }
        throw e;
      }
    },

    async deleteUser(id, adminKey) {
      try {
        return await fetchJson(`/api/users/${id}`, {
          method: "DELETE",
          headers: adminKey ? { "x-admin-key": adminKey } : {},
        });
      } catch (e) {
        const users = readLocal("users", []);
        writeLocal(
          "users",
          users.filter((item) => String(item.id) !== String(id)),
        );
        return { ok: true };
      }
    },

    async createTest(test, adminKey) {
      try {
        return await fetchJson("/api/tests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminKey ? { "x-admin-key": adminKey } : {}),
          },
          body: JSON.stringify(test),
        });
      } catch (e) {
        const list = readLocal("public_tests", []);
        const item = Object.assign({ id: Date.now() }, test);
        list.push(item);
        writeLocal("public_tests", list);
        return item;
      }
    },

    async updateTest(id, test, adminKey) {
      try {
        return await fetchJson(`/api/tests/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(adminKey ? { "x-admin-key": adminKey } : {}),
          },
          body: JSON.stringify(test),
        });
      } catch (e) {
        const list = readLocal("public_tests", []);
        const idx = list.findIndex((item) => String(item.id) === String(id));
        if (idx !== -1) {
          list[idx] = Object.assign({}, list[idx], test);
          writeLocal("public_tests", list);
          return list[idx];
        }
        throw e;
      }
    },

    async deleteTest(id, adminKey) {
      try {
        return await fetchJson(`/api/tests/${id}`, {
          method: "DELETE",
          headers: adminKey ? { "x-admin-key": adminKey } : {},
        });
      } catch (e) {
        const list = readLocal("public_tests", []);
        writeLocal(
          "public_tests",
          list.filter((item) => String(item.id) !== String(id)),
        );
        return { ok: true };
      }
    },

    async adminLogin(password) {
      try {
        return await fetchJson("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
      } catch (e) {
        return null;
      }
    },

    async getResults(adminKey) {
      try {
        return await fetchJson("/api/results", {
          method: "GET",
          headers: { "x-admin-key": adminKey },
        });
      } catch (e) {
        return readLocal("results", []);
      }
    },

    async getUsers(adminKey) {
      try {
        return await fetchJson("/api/users", {
          method: "GET",
          headers: { "x-admin-key": adminKey },
        });
      } catch (e) {
        return readLocal("users", []);
      }
    },
  };
})();
