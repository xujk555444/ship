from __future__ import annotations

import unittest
from datetime import date as real_date
from unittest.mock import patch

from fastapi import HTTPException

from web_app import GenerateRequest, GenerateStatePayload, generate, health, reset_state


class FakeDate(real_date):
    @classmethod
    def today(cls) -> "FakeDate":
        return cls(2026, 3, 22)


class WebAppTests(unittest.TestCase):
    def test_health_endpoint(self) -> None:
        self.assertEqual(health(), {"status": "ok"})

    def test_generate_uses_saved_flow(self) -> None:
        result = generate(
            GenerateRequest(
                raw_text="船号:福顺855\n报装4600吨\n流向:高栏到云浮\n船期:13号",
                state=GenerateStatePayload(
                    big_ship_no="九华真诚",
                    flow="高栏—都骑",
                    current_total=1000,
                ),
            )
        )
        self.assertIn("流向：高栏—都骑", result["output"])

    def test_generate_requires_flow(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            generate(
                GenerateRequest(
                    raw_text="船号:福顺855\n报装4600吨\n流向:高栏到都骑\n船期:13号",
                    state=GenerateStatePayload(
                        big_ship_no="九华真诚",
                        flow="",
                        current_total=0,
                    ),
                )
            )

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "请先在当前状态中填写流向。")

    def test_generate_compact_message_uses_next_day_schedule(self) -> None:
        with patch("shipment_tool.date", FakeDate):
            result = generate(
                GenerateRequest(
                    raw_text="@达峰3013 装煤2800吨",
                    state=GenerateStatePayload(
                        big_ship_no="九华真诚",
                        flow="高栏—都骑",
                        current_total=0,
                    ),
                )
            )

        self.assertIn("船期：3月23日", result["output"])

    def test_reset_state_endpoint(self) -> None:
        result = reset_state()
        self.assertEqual(
            result["state"],
            {"big_ship_no": "", "flow": "", "current_total": 0},
        )


if __name__ == "__main__":
    unittest.main()
