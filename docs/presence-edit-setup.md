# Online status, last seen and message editing: setup

## 1. Run the SQL (once)

Supabase Dashboard → SQL Editor → paste all of `supabase/presence_edit.sql` → Run.
It is safe to run again. At the bottom it prints two names: **edited_at** and **presence**.

If you ever re-run `account_deletion.sql` or `messaging_slots.sql`, run
`presence_edit.sql` again straight after. Those older files reset the rule
that protects messages, which would switch editing off.

Until this is run, nothing breaks: no one shows as online and there's no Edit option.

## 2. What people see

- **Online / last seen (only to people you chat with):**
  - In a chat, under the person's name: green **Online**, or **Last seen 10:42**,
    **Last seen yesterday**, **Last seen 12 Oct**.
  - In the inbox: a green dot on the photo of anyone online.
  - "Online" means their app or website checked in within the last 2 minutes.
    It checks in once a minute, and only while the app is open in front of them
    or the website tab is visible.
  - Nobody else can see when you're online: not on your profile, not anywhere.
- **Editing a sent message:**
  - App: long-press your own message → **Edit**. Website: click the small
    **Edit** next to the time on your own message.
  - Only for 3 minutes after sending. The option disappears by itself.
  - The other person sees the new text straight away with **edited** beside the time.
    No new notification is sent.

## 3. Quick test (two accounts, A and B)

1. Open a chat between A and B on two devices (or the app and the website).
2. B's chat header shows **Online** for A within about a minute.
3. Close A's app (or switch A's browser tab away). After about 2–3 minutes B
   sees **Last seen** with the time.
4. On A, send a message, then edit it. B sees the new text with **edited**.
5. Wait 3 minutes: the Edit option is gone on A.
