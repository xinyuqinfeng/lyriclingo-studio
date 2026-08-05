use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LineStatus {
    Pending,
    InProgress,
    Succeeded,
    Failed(String),
    Cancelled,
}

#[derive(Debug, Clone)]
pub struct LineTask {
    pub index: usize,
    pub line: String,
    pub status: LineStatus,
}

#[derive(Debug, Clone)]
pub struct AnalysisQueue {
    lines: Arc<Mutex<VecDeque<LineTask>>>,
    cancelled: Arc<Mutex<bool>>,
}

impl AnalysisQueue {
    pub fn new(lines: Vec<(usize, String)>) -> Self {
        let queue: VecDeque<LineTask> = lines
            .into_iter()
            .map(|(index, line)| LineTask {
                index,
                line,
                status: LineStatus::Pending,
            })
            .collect();
        Self {
            lines: Arc::new(Mutex::new(queue)),
            cancelled: Arc::new(Mutex::new(false)),
        }
    }

    /// Marks the queue as cancelled; unstarted lines will not be processed.
    pub fn cancel(&self) {
        *self.cancelled.lock().unwrap() = true;
    }

    pub fn is_cancelled(&self) -> bool {
        *self.cancelled.lock().unwrap()
    }

    /// Claims the next pending line for processing, or None if empty/cancelled.
    pub fn claim_next(&self) -> Option<LineTask> {
        if self.is_cancelled() {
            return None;
        }
        let mut guard = self.lines.lock().unwrap();
        for task in guard.iter_mut() {
            if task.status == LineStatus::Pending {
                task.status = LineStatus::InProgress;
                return Some(task.clone());
            }
        }
        None
    }

    pub fn mark_success(&self, index: usize) {
        let mut guard = self.lines.lock().unwrap();
        if let Some(t) = guard.iter_mut().find(|t| t.index == index) {
            t.status = LineStatus::Succeeded;
        }
    }

    pub fn mark_failed(&self, index: usize, error: String) {
        let mut guard = self.lines.lock().unwrap();
        if let Some(t) = guard.iter_mut().find(|t| t.index == index) {
            t.status = LineStatus::Failed(error);
        }
    }

    pub fn mark_cancelled(&self, index: usize) {
        let mut guard = self.lines.lock().unwrap();
        if let Some(t) = guard.iter_mut().find(|t| t.index == index) {
            t.status = LineStatus::Cancelled;
        }
    }

    pub fn statuses(&self) -> Vec<LineTask> {
        self.lines.lock().unwrap().iter().cloned().collect()
    }

    pub fn pending_count(&self) -> usize {
        self.lines
            .lock()
            .unwrap()
            .iter()
            .filter(|t| t.status == LineStatus::Pending || t.status == LineStatus::InProgress)
            .count()
    }

    pub fn failed(&self) -> Vec<LineTask> {
        self.lines
            .lock()
            .unwrap()
            .iter()
            .filter(|t| matches!(t.status, LineStatus::Failed(_)))
            .cloned()
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claims_lines_in_order() {
        let q = AnalysisQueue::new(vec![(0, "a".into()), (1, "b".into())]);
        let first = q.claim_next().expect("first");
        assert_eq!(first.index, 0);
        let second = q.claim_next().expect("second");
        assert_eq!(second.index, 1);
        assert!(q.claim_next().is_none());
    }

    #[test]
    fn single_failure_does_not_block_others() {
        let q = AnalysisQueue::new(vec![(0, "a".into()), (1, "b".into())]);
        let first = q.claim_next().expect("first");
        q.mark_failed(first.index, "boom".into());
        let second = q.claim_next().expect("second");
        q.mark_success(second.index);
        assert_eq!(q.failed().len(), 1);
        assert_eq!(q.pending_count(), 0);
    }

    #[test]
    fn cancel_stops_claiming_unstarted_lines() {
        let q = AnalysisQueue::new(vec![(0, "a".into()), (1, "b".into())]);
        q.claim_next().expect("first");
        q.cancel();
        assert!(q.claim_next().is_none());
        q.mark_cancelled(1);
        let cancelled = q
            .statuses()
            .iter()
            .filter(|t| t.status == LineStatus::Cancelled)
            .count();
        assert_eq!(cancelled, 1);
    }

    #[test]
    fn is_cancelled_flag() {
        let q = AnalysisQueue::new(vec![]);
        assert!(!q.is_cancelled());
        q.cancel();
        assert!(q.is_cancelled());
    }
}
