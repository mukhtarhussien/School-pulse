ALTER TABLE public.users
  ADD CONSTRAINT users_username_min_length_check
  CHECK (username IS NULL OR char_length(username) >= 5);

ALTER TABLE public.registration_requests
  ADD CONSTRAINT registration_requests_username_min_length_check
  CHECK (username IS NULL OR char_length(username) >= 5);
