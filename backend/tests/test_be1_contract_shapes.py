import pytest
from fastapi.testclient import TestClient
from app.main import app
import json

@pytest.fixture
def client():
    return TestClient(app)

def test_contract_shapes(client):
    # Ingest
    r = client.post('/api/ingest/citizen', json={'text': 'Fire in a factory near Makarpura GIDC, 3 people trapped'})
    ingest_res = r.json()
    
    assert set(ingest_res.keys()) == {'report_id', 'incident_id', 'action', 'classification', 'track_id'}
    cls = ingest_res['classification']
    assert set(cls.keys()) == {'type', 'severity', 'priority', 'confidence', 'reasoning', 'extracted', 'model'}
    assert set(cls['extracted'].keys()) == {'people_affected', 'hazards', 'location_text', 'needs'}
    
    inc_id = ingest_res['incident_id']
    
    # IncidentOut/Detail
    r2 = client.get(f'/api/incidents/{inc_id}')
    out = r2.json()
    assert set(out.keys()) == {'id', 'code', 'type', 'title', 'summary', 'severity', 'priority', 'confidence', 'status', 'escalated', 'escalation_level', 'lat', 'lng', 'area', 'people_affected', 'hazards', 'report_count', 'sources', 'created_at', 'triaged_at', 'first_assigned_at', 'first_arrival_at', 'resolved_at', 'sla_due_at', 'track_id', 'decision_log', 'assignments', 'shortages', 'reports', 'related', 'alerts', 'notifications'}
    
    rep_out = out['reports'][0]
    assert set(rep_out.keys()) == {'id', 'source', 'text', 'lat', 'lng', 'location_text', 'reliability', 'created_at', 'incident_id', 'classification'}
    
    # AI Shapes
    sum_res = client.post(f'/api/ai/incident/{inc_id}/summary').json()
    assert set(sum_res.keys()) == {'summary', 'timeline', 'risks', 'questions', 'model'}
    
    sop_res = client.post(f'/api/ai/incident/{inc_id}/sop').json()
    assert set(sop_res.keys()) == {'checklist', 'model'}
    assert set(sop_res['checklist'][0].keys()) == {'step', 'done'}
    
    brief_res = client.post('/api/ai/brief').json()
    assert set(brief_res.keys()) == {'brief', 'top_risks', 'reinforcement', 'generated_at', 'model'}
    
    q_res = client.post('/api/ai/query', json={'q': 'Hello'}).json()
    assert set(q_res.keys()) == {'answer', 'model'}
    
    # Track
    track_id = ingest_res['track_id']
    track_res = client.get(f'/api/track/{track_id}').json()
    assert set(track_res.keys()) == {'code', 'type', 'status', 'area', 'eta_min', 'updates'}
    
    print("\n--- IncidentDetail ---")
    print(json.dumps(out, indent=2))
    
    print("\n--- AI Brief ---")
    print(json.dumps(brief_res, indent=2))

