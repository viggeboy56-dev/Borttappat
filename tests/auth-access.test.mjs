import assert from "node:assert/strict";
import test from "node:test";
import { getAccessDecision } from "../src/lib/auth/access.ts";

const authenticated = (role, pathname) =>
  getAccessDecision({
    pathname,
    isAuthenticated: true,
    hasProfile: true,
    role,
  });

test("unauthenticated users are sent to login", () => {
  assert.equal(
    getAccessDecision({
      pathname: "/dashboard",
      isAuthenticated: false,
      hasProfile: false,
      role: null,
    }),
    "login",
  );
});

test("authenticated users with profiles can open the dashboard", () => {
  assert.equal(authenticated("member", "/dashboard"), "allow");
});

test("authenticated users without profiles are sent to onboarding", () => {
  assert.equal(
    getAccessDecision({
      pathname: "/dashboard",
      isAuthenticated: true,
      hasProfile: false,
      role: null,
    }),
    "onboarding",
  );
});

test("members are denied staff and admin routes", () => {
  assert.equal(authenticated("member", "/dashboard/my-claims"), "allow");
  assert.equal(authenticated("member", "/dashboard/items/new"), "denied");
  assert.equal(authenticated("member", "/dashboard/claims"), "denied");
  assert.equal(authenticated("member", "/dashboard/admin"), "denied");
});

test("staff can manage items and claims", () => {
  assert.equal(authenticated("staff", "/dashboard/my-claims"), "denied");
  assert.equal(authenticated("staff", "/dashboard/items/new"), "allow");
  assert.equal(authenticated("staff", "/dashboard/claims"), "allow");
});

test("staff are denied admin routes", () => {
  assert.equal(authenticated("staff", "/dashboard/admin"), "denied");
});

test("school admins can open all Phase 3 dashboard routes", () => {
  assert.equal(authenticated("school_admin", "/dashboard/my-claims"), "denied");
  assert.equal(authenticated("school_admin", "/dashboard"), "allow");
  assert.equal(authenticated("school_admin", "/dashboard/items/new"), "allow");
  assert.equal(authenticated("school_admin", "/dashboard/claims"), "allow");
  assert.equal(authenticated("school_admin", "/dashboard/admin"), "allow");
});
