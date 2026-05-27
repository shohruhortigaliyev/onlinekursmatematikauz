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
