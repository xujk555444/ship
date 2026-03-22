from __future__ import annotations

import unittest
from datetime import date as real_date
from unittest.mock import patch

from shipment_tool import ParsedShipment, ShipmentState, build_output, parse_message


class FakeDate(real_date):
    @classmethod
    def today(cls) -> "FakeDate":
        return cls(2026, 3, 22)


class ShipmentToolTests(unittest.TestCase):
    def test_phone_with_label(self) -> None:
        parsed = parse_message("船号:福顺855\n报装4600吨\n电话13729786260\n船期:13号")
        self.assertEqual(parsed.phone, "13729786260")

    def test_phone_with_standalone_number(self) -> None:
        parsed = parse_message("@达峰3013 业务 13533036861 装煤2800吨")
        self.assertEqual(parsed.phone, "13533036861")

    def test_amount_variants(self) -> None:
        cases = {
            "船号:粤兴168\n计划装3000吨": 3000,
            "船号:大福666\n报装5050": 5050,
            "船号:海亚88\n装3200吨": 3200,
            "@达峰3013 装煤2800吨": 2800,
        }
        for raw_text, expected_amount in cases.items():
            with self.subTest(raw_text=raw_text):
                self.assertEqual(parse_message(raw_text).amount, expected_amount)

    def test_ship_no_variants(self) -> None:
        cases = {
            "@达峰3013 装煤2800吨": "达峰3013",
            "船号:福顺855\n报装4600吨": "福顺855",
            "港盛238船\n报装3994吨": "港盛238",
        }
        for raw_text, expected_ship_no in cases.items():
            with self.subTest(raw_text=raw_text):
                self.assertEqual(parse_message(raw_text).ship_no, expected_ship_no)

    def test_original_flow_text_is_ignored(self) -> None:
        parsed = parse_message("船号:测试1\n报装1000吨\n流向:高栏到云浮")
        self.assertEqual(parsed.flow, "")

    def test_output_always_uses_saved_flow(self) -> None:
        parsed = parse_message("船号:大福666\n报装5050\n电话：18278581133\n高栏-都骑\n船期:13号")
        output, _ = build_output(
            parsed,
            ShipmentState(big_ship_no="九华真诚", flow="高栏—都骑", current_total=1000),
        )
        self.assertIn("流向：高栏—都骑", output)

    def test_schedule_variants(self) -> None:
        cases = {
            "船号:启帆顺达898\n报装4900吨\n船期:吉船": "3月22日",
            "船号:福顺855\n报装4600吨\n船期:13号": "3月13日",
            "船名：平南富伟228\n报装：4000吨\n船期：3月14日": "3月14日",
            "@达峰3013 装煤2800吨": "3月23日",
        }
        with patch("shipment_tool.date", FakeDate):
            for raw_text, expected_schedule in cases.items():
                with self.subTest(raw_text=raw_text):
                    self.assertEqual(parse_message(raw_text).schedule, expected_schedule)

    def test_first_shipment_uses_amount_as_total(self) -> None:
        parsed = ParsedShipment(ship_no="海亚88", amount=3200, phone="", flow="", schedule="3月22日")
        _, total = build_output(parsed, ShipmentState(big_ship_no="九华真诚", flow="高栏—都骑", current_total=0))
        self.assertEqual(total, 3200)

    def test_followup_shipment_adds_to_total(self) -> None:
        parsed = ParsedShipment(ship_no="中和2029", amount=1900, phone="", flow="", schedule="3月23日")
        _, total = build_output(parsed, ShipmentState(big_ship_no="九华真诚", flow="高栏—都骑", current_total=3200))
        self.assertEqual(total, 5100)


if __name__ == "__main__":
    unittest.main()
