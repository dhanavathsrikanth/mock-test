begin;
alter table public.test_sessions add column sprint_active_seconds integer;
alter table public.test_sessions add constraint sprint_active_time_valid
  check (sprint_active_seconds is null or (mode = 'sprint' and sprint_active_seconds between 0 and duration_minutes * 60));
alter table public.test_sessions drop constraint test_sessions_mode_check;
alter table public.test_sessions add constraint test_sessions_mode_check
  check (mode in ('full_mock','full_paper','subject_wise','topic_wise','custom','sprint'));
alter table public.test_sessions add constraint sprint_session_shape
  check (mode <> 'sprint' or (total_questions = 5 and duration_minutes in (12,15) and question_ids is not null and cardinality(question_ids) = 5));
create index test_sessions_open_sprints on public.test_sessions(user_id, exam_id, stream_id, started_at desc)
  where mode = 'sprint' and status = 'in_progress';
commit;
