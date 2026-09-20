import sys
import asyncio
from unittest.mock import AsyncMock, MagicMock
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

class FakeBus:
    def __init__(self):
        self.publish = AsyncMock()

fake_events = MagicMock()
fake_events.bus = FakeBus()

fake_recommend = MagicMock()
fake_recommend.plan = AsyncMock()

fake_sla = MagicMock()
fake_sla.evaluate_incident = AsyncMock()

fake_notify = MagicMock()
fake_notify.route = AsyncMock()

# Inject into sys.modules
sys.modules['app.core.events'] = fake_events
sys.modules['app.services.recommend'] = fake_recommend
sys.modules['app.services.sla'] = fake_sla
sys.modules['app.services.notify'] = fake_notify

@pytest.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_pipeline_hooks(async_client):
    # Reset mocks
    fake_events.bus.publish.reset_mock()
    fake_recommend.plan.reset_mock()
    fake_sla.evaluate_incident.reset_mock()
    fake_notify.route.reset_mock()
    
    # 1. New Incident
    r1 = await async_client.post('/api/ingest', json={"source": "citizen", "payload": {'text': 'Hook test new fire', 'lat': 22.3, 'lng': 73.2}})
    inc_id = r1.json()['incident_id']
    
    await asyncio.sleep(0.2)
    
    # Assertions for NEW
    fake_events.bus.publish.assert_any_call('report.new', {'incident_id': inc_id})
    upsert_call = [call for call in fake_events.bus.publish.call_args_list if call[0][0] == 'incident.upsert']
    assert len(upsert_call) >= 1
    
    fake_recommend.plan.assert_called_once_with(inc_id)
    fake_sla.evaluate_incident.assert_called_once_with(inc_id)
    fake_notify.route.assert_called_once_with('incident.created', inc_id, {})
    
    # 2. Merge (no severity increase)
    fake_events.bus.publish.reset_mock()
    fake_recommend.plan.reset_mock()
    fake_sla.evaluate_incident.reset_mock()
    fake_notify.route.reset_mock()
    
    r2 = await async_client.post('/api/ingest', json={"source": "citizen", "payload": {'text': 'Hook test new fire again', 'lat': 22.3, 'lng': 73.2, 'external_id': 'merge1'}})
    await asyncio.sleep(0.2)
    
    fake_recommend.plan.assert_not_called()
    fake_sla.evaluate_incident.assert_called_once_with(inc_id)
    fake_notify.route.assert_not_called()
    fake_events.bus.publish.assert_any_call('report.new', {'incident_id': inc_id})
    
    # 3. Merge with severity increase
    fake_events.bus.publish.reset_mock()
    fake_recommend.plan.reset_mock()
    fake_sla.evaluate_incident.reset_mock()
    fake_notify.route.reset_mock()
    
    r3 = await async_client.post('/api/ingest', json={"source": "citizen", "payload": {'text': 'Hook test new fire massive, people trapped', 'lat': 22.3, 'lng': 73.2, 'external_id': 'merge2'}})
    await asyncio.sleep(0.2)
    
    fake_recommend.plan.assert_called_once_with(inc_id)
    fake_sla.evaluate_incident.assert_called_once_with(inc_id)
    fake_notify.route.assert_called_once_with('incident.escalated', inc_id, {})
    
    # 4. Exception in hooks doesn't break ingest
    fake_recommend.plan.side_effect = Exception("Fake crash")
    r4 = await async_client.post('/api/ingest', json={"source": "citizen", "payload": {'text': 'Hook test another fire'}})
    assert r4.status_code == 200
    assert 'incident_id' in r4.json()


