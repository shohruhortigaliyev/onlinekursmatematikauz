/* Supabase API wrapper for Matematika.uz */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://dfkhuomahqiwvzieyorx.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRma2h1b21haHFpd3Z6aWV5b3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NzU5ODcsImV4cCI6MjA5NTQ1MTk4N30.dBdWHzQJ_9MyXpJLA5jvuRSB4uUpINPe2naTi8bu48M";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SESSION_USER_KEY = "matematika_current_user";
const SESSION_ADMIN_KEY = "matematika_admin_session";
const SESSION_ACTIVE_TEST_KEY = "matematika_active_test";

const DEFAULT_ADMIN = {
  login: "admin",
  password: "admin123",
  fullname: "Platforma Administrator",
};

const DEMO_USER = {
  login: "00-913",
  password: "123456",
  fullname: "Demo Foydalanuvchi",
  status: "Faol",
};

function normalizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullname: row.fullname,
    login: row.code || row.login || "",
    status: row.status || "",
    createdAt: row.created_at || row.createdAt || null,
  };
}

function normalizeTest(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    time: row.time,
    type: row.type,
    questions: row.questions || [],
    createdAt: row.created_at || row.createdAt || null,
  };
}

function normalizeResult(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id || row.userId || null,
    fullname: row.full_name || row.fullname || "Anon",
    login: row.login || null,
    test: row.test_name || row.test || "Test",
    score: Number(row.score || 0),
    correct: Number(row.correct || 0),
    wrong: Number(row.wrong || 0),
    percent: Number(row.percent || row.score || 0),
    time: row.time_taken || row.time || "",
    date: row.created_at || row.date || null,
  };
}

function userToDb(user) {
  return {
    fullname: user.fullname,
    code: user.login,
    password: user.password,
    status: user.status || "Faol",
    created_at: user.createdAt || new Date().toISOString(),
  };
}

function testToDb(test) {
  return {
    id: test.id,
    name: test.name,
    time: Number(test.time || 120),
    type: test.type || "",
    questions: test.questions || [],
    created_at: test.createdAt || new Date().toISOString(),
  };
}

function resultToDb(result) {
  return {
    user_id: result.userId || null,
    full_name: result.fullname || result.login || "Anon",
    login: result.login || null,
    test_name: result.test || "Test",
    score: Number(result.score || 0),
    correct: Number(result.correct || 0),
    wrong: Number(result.wrong || 0),
    percent: Number(result.percent || result.score || 0),
    time_taken: result.time || "",
    created_at: result.date || new Date().toISOString(),
  };
}

async function safeUpsert(table, payload, onConflict) {
  const { data, error } = await supabase.from(table).upsert(payload, {
    onConflict,
    returning: "representation",
  });
  if (error) throw error;
  return data;
}

window.api = {
  setSessionUser(user) {
    if (!user) return;
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  },

  getCurrentUser() {
    try {
      const raw = sessionStorage.getItem(SESSION_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  },

  clearSessionUser() {
    sessionStorage.removeItem(SESSION_USER_KEY);
  },

  setActiveTestId(id) {
    if (!id) return;
    sessionStorage.setItem(SESSION_ACTIVE_TEST_KEY, String(id));
  },

  getActiveTestId() {
    return sessionStorage.getItem(SESSION_ACTIVE_TEST_KEY);
  },

  clearActiveTestId() {
    sessionStorage.removeItem(SESSION_ACTIVE_TEST_KEY);
  },

  setAdminSession(admin) {
    if (!admin) return;
    sessionStorage.setItem(SESSION_ADMIN_KEY, JSON.stringify(admin));
  },

  getAdminSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_ADMIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  },

  clearAdminSession() {
    sessionStorage.removeItem(SESSION_ADMIN_KEY);
  },

  async loginUser(login, password) {
    if (!login || !password) {
      return { ok: false, error: "empty" };
    }
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("code", login)
      .eq("password", password)
      .limit(1)
      .single();
    if (error && error.code !== "PGRST116") {
      console.error("Login xatolik:", error);
      return { ok: false, error };
    }
    if (!data) {
      console.warn("Foydalanuvchi topilmadi:", login);
      return { ok: false };
    }
    const user = normalizeUser(data);
    this.setSessionUser(user);
    return { ok: true, user };
  },

  async adminLogin(login, password) {
    // Avval default admin-ni tekshir
    if (login === DEFAULT_ADMIN.login && password === DEFAULT_ADMIN.password) {
      console.log("✅ Default admin login muvaffaqiyatli");
      this.setAdminSession({ login: DEFAULT_ADMIN.login, id: "default-admin" });
      return { ok: true, admin: { login: DEFAULT_ADMIN.login } };
    }

    // Supabase-da qidirish
    try {
      await this.ensureDefaultAdmin();
    } catch (e) {
      console.warn("ensureDefaultAdmin xatolik:", e);
    }

    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .eq("login", login)
      .eq("password", password)
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Admin login xatolik:", error);
      return { ok: false, error: error.message };
    }
    if (!data) {
      console.warn("Admin topilmadi Supabase-da:", { login, password });
      // Debug: tekshir barcha admin ma'lumotlarni
      const { data: allAdmins } = await supabase.from("admins").select("*");
      console.debug("Barcha admins:", allAdmins);
      return { ok: false };
    }
    this.setAdminSession({ login: data.login, id: data.id });
    return { ok: true, admin: data };
  },

  async getUsers() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeUser);
  },

  async getUserByCode(login) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("code", login)
      .limit(1)
      .single();
    if (error && error.code !== "PGRST116") {
      console.error("getUserByCode xatolik:", error);
      throw error;
    }
    return normalizeUser(data);
  },

  async createUser(user) {
    const payload = userToDb(user);
    console.log("userToDb payload (create):", payload);
    const { data, error } = await supabase
      .from("users")
      .insert([payload])
      .select("*")
      .single();
    if (error) {
      console.error("createUser xatolik:", error);
      throw new Error(
        `Foydalanuvchi yaratishda xatolik: ${error.message || error.code}`,
      );
    }
    return normalizeUser(data);
  },

  async updateUser(user) {
    const payload = userToDb(user);
    console.log("userToDb payload (update):", payload);
    console.log("ID orqali update:", user.id);
    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", user.id)
      .select("*")
      .single();
    if (error) {
      console.error("updateUser xatolik:", error);
      throw new Error(
        `Foydalanuvchi yangilashda xatolik: ${error.message || error.code}`,
      );
    }
    return normalizeUser(data);
  },

  async updateUserPassword(login, oldPassword, newPassword) {
    const user = await this.getUserByCode(login);
    if (!user || user.login !== login) {
      return { ok: false, error: "user_not_found" };
    }
    const { data, error } = await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("id", user.id)
      .select("*")
      .single();
    if (error) return { ok: false, error };
    return { ok: true, user: normalizeUser(data) };
  },

  async deleteUser(id) {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;
  },

  async getTests() {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeTest);
  },

  async createTest(test) {
    const payload = testToDb(test);
    const { data, error } = await supabase
      .from("tests")
      .insert([payload])
      .select("*")
      .single();
    if (error) throw error;
    return normalizeTest(data);
  },

  async updateTest(test) {
    const payload = testToDb(test);
    const { data, error } = await supabase
      .from("tests")
      .update(payload)
      .eq("id", test.id)
      .select("*")
      .single();
    if (error) throw error;
    return normalizeTest(data);
  },

  async deleteTest(id) {
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) throw error;
  },

  async postResult(result) {
    const payload = resultToDb(result);
    const { error } = await supabase.from("results").insert([payload]);
    if (error) throw error;
  },

  async getResults() {
    const { data, error } = await supabase
      .from("results")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeResult);
  },

  async getUserResults(userId, login) {
    let query = supabase.from("results").select("*").order("created_at", {
      ascending: false,
    });
    if (userId) {
      query = query.eq("user_id", userId);
    } else if (login) {
      query = query.eq("login", login);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(normalizeResult);
  },

  subscribeToResults(onInsert) {
    if (typeof onInsert !== "function") return null;
    const channel = supabase
      .channel("realtime_results")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "results" },
        (payload) => {
          onInsert(normalizeResult(payload.new));
        },
      )
      .subscribe();
    return {
      unsubscribe() {
        supabase.removeChannel(channel);
      },
    };
  },

  async ensureDemoUser() {
    try {
      await safeUpsert(
        "users",
        [
          {
            fullname: DEMO_USER.fullname,
            code: DEMO_USER.login,
            password: DEMO_USER.password,
            status: DEMO_USER.status,
            created_at: new Date().toISOString(),
          },
        ],
        "code",
      );
    } catch (error) {
      // ignore if table is not ready or duplicate handling is missing
    }
  },

  async ensureDefaultAdmin() {
    try {
      // Avval tekshir admin mavjudmi
      const { data: existing } = await supabase
        .from("admins")
        .select("*")
        .eq("login", DEFAULT_ADMIN.login)
        .limit(1)
        .single();

      if (existing) {
        console.debug("Admin allaqachon mavjud:", existing);
        return;
      }

      // Agar yo'q bo'lsa, yangi admin qo'sh
      const { data: created, error } = await supabase
        .from("admins")
        .insert([
          {
            login: DEFAULT_ADMIN.login,
            password: DEFAULT_ADMIN.password,
            fullname: DEFAULT_ADMIN.fullname,
            created_at: new Date().toISOString(),
          },
        ])
        .select("*")
        .single();

      if (error) {
        console.error("Admin yaratishda xatolik:", error);
        throw error;
      }
      console.debug("Admin muvaffaqiyatli yaratildi:", created);
    } catch (error) {
      console.error("ensureDefaultAdmin xatolik:", error);
      // Agar table yo'q bo'lsa, o'tib yuboramiz
      throw error;
    }
  },
};
