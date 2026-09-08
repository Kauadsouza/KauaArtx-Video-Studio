ALTER TABLE public."MemberGrant"
  DROP CONSTRAINT IF EXISTS "MemberGrant_app_check";
ALTER TABLE public."MemberGrant"
  ADD CONSTRAINT "MemberGrant_app_check"
  CHECK (app IN ('hub', 'videos', 'study', 'university'));

ALTER TABLE public."MemberSession"
  DROP CONSTRAINT IF EXISTS "MemberSession_app_check";
ALTER TABLE public."MemberSession"
  ADD CONSTRAINT "MemberSession_app_check"
  CHECK (app IN ('hub', 'videos', 'study', 'university'));

ALTER TABLE public."MemberState"
  DROP CONSTRAINT IF EXISTS "MemberState_app_check";
ALTER TABLE public."MemberState"
  ADD CONSTRAINT "MemberState_app_check"
  CHECK (app IN ('hub', 'videos', 'study', 'university'));
