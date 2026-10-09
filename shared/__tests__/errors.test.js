import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyError, OFFLINE_MESSAGE } from "../errors.js";

test("network failures become a plain offline message", () => {
  for (const message of [
    "fetch failed: UnexpectedException: The Internet connection appears to be offline. (at ExpoModulesCore/Promise.swift:56)",
    "Network request failed",
    "TypeError: Failed to fetch",
    "Load failed",
  ]) {
    assert.equal(friendlyError({ message }), OFFLINE_MESSAGE);
  }
});

test("an empty or odd error never shows raw text", () => {
  assert.equal(friendlyError({}), "Something went wrong. Please try again.");
  assert.equal(friendlyError({ message: "{}" }), "Something went wrong. Please try again.");
  assert.equal(friendlyError(null), "Something went wrong. Please try again.");
});

test("common sign-in problems read like a person wrote them", () => {
  assert.equal(friendlyError({ message: "Invalid login credentials" }), "That email and password don't match. Try again or reset your password.");
  assert.equal(friendlyError({ message: "Email not confirmed" }), "Please confirm your email first. We sent you a link when you signed up.");
  assert.equal(friendlyError({ message: "User already registered" }), "An account with this email already exists. Log in instead.");
  assert.equal(friendlyError({ status: 429, message: "email rate limit exceeded" }), "Too many attempts. Please wait a few minutes and try again.");
  assert.equal(friendlyError({ message: "Database error saving new user" }), "We couldn't create your account just now. Please try again in a moment.");
});

test("messages already written for people pass through", () => {
  assert.equal(friendlyError({ message: "That time is already taken. Please choose another." }), "That time is already taken. Please choose another.");
});

test("technical messages are replaced", () => {
  assert.equal(friendlyError({ message: 'duplicate key value violates unique constraint "x_pkey"' }), "Something went wrong. Please try again.");
  assert.equal(friendlyError({ message: "JWT expired" }), "Your session has ended. Please log in again.");
});
