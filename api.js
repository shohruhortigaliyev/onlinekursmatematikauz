/* CLEAN SUPABASE API */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://dfkhuomahqiwvzieyorx.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRma2h1b21haHFpd3Z6aWV5b3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NzU5ODcsImV4cCI6MjA5NTQ1MTk4N30.dBdWHzQJ_9MyXpJLA5jvuRSB4uUpINPe2naTi8bu48M";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

window.api = {
  async getTests() {
    const { data } = await supabase.from("tests").select("*");
    return data || [];
  },

  async createTest(test) {
    const { error } = await supabase.from("tests").insert([test]);
    if (error) throw error;
  },

  async deleteTest(id) {
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) throw error;
  },

  async getUsers() {
    const { data } = await supabase.from("users").select("*");
    return data || [];
  },

  async createUser(user) {
    const { error } = await supabase.from("users").insert([user]);
    if (error) throw error;
  },

  async deleteUser(id) {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;
  },

  async postResult(result) {
    const { error } = await supabase.from("results").insert([result]);
    if (error) throw error;
  },

  async getResults() {
    const { data } = await supabase.from("results").select("*");
    return data || [];
  },
};
