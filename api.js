/* Supabase API (REAL DATABASE) */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://dfkhuomahqiwvzieyorx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRma2h1b21haHFpd3Z6aWV5b3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NzU5ODcsImV4cCI6MjA5NTQ1MTk4N30.dBdWHzQJ_9MyXpJLA5jvuRSB4uUpINPe2naTi8bu48M";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.api = {
  // TESTS
  async getTests() {
    const { data } = await supabase.from("tests").select("*");
    return data || [];
  },

  // USERS
  async getUsers() {
    const { data } = await supabase.from("users").select("*");
    return data || [];
  },

  async createUser(user) {
    const { data, error } = await supabase.from("users").insert([user]);
    if (error) throw error;
    return data;
  },

  async updateUser(id, user) {
    const { data, error } = await supabase
      .from("users")
      .update(user)
      .eq("id", id);
    if (error) throw error;
    return data;
  },

  async deleteUser(id) {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;
  },

  // RESULTS
  async postResult(result) {
    const { data, error } = await supabase
      .from("results")
      .insert([result]);
    if (error) throw error;
    return data;
  },

  async getResults() {
    const { data } = await supabase.from("results").select("*");
    return data || [];
  },

  // ADMIN LOGIN (simple check)
  async adminLogin(password) {
    if (password === "admin123") {
      return { ok: true };
    }
    return null;
  },
};