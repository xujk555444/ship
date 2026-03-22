from __future__ import annotations

import os
import unittest
from datetime import date as real_date
from unittest.mock import patch

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PySide6.QtWidgets import QApplication, QMessageBox

from app import MainWindow


class FakeDate(real_date):
    @classmethod
    def today(cls) -> "FakeDate":
        return cls(2026, 3, 22)


class MainWindowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self) -> None:
        self.window = MainWindow()
        self.window.big_ship_edit.setText("九华真诚")
        self.window.flow_edit.setText("高栏—都骑")
        self.window.total_edit.setText("1000")

    def tearDown(self) -> None:
        self.window.close()

    def test_output_text_is_editable(self) -> None:
        self.assertFalse(self.window.output_text.isReadOnly())

    def test_copy_output_is_silent(self) -> None:
        self.window.output_text.setPlainText("测试复制内容")

        with patch.object(QMessageBox, "information") as info_mock:
            self.window.copy_output()

        self.assertEqual(self.app.clipboard().text(), "测试复制内容")
        info_mock.assert_not_called()

    def test_generate_overwrites_manual_edits(self) -> None:
        with patch("shipment_tool.date", FakeDate):
            self.window.raw_input.setPlainText("@达峰3013 装煤2800吨")
            self.window.generate_output()

        self.window.output_text.setPlainText("手工修改内容")

        with patch("shipment_tool.date", FakeDate):
            self.window.raw_input.setPlainText("船号:大福666\n报装5050\n电话：18278581133\n船期:13号")
            self.window.generate_output()

        self.assertNotEqual(self.window.output_text.toPlainText(), "手工修改内容")
        self.assertIn("船号:大福666", self.window.output_text.toPlainText())

    def test_manual_edit_does_not_change_state(self) -> None:
        with patch("shipment_tool.date", FakeDate):
            self.window.raw_input.setPlainText("@达峰3013 装煤2800吨")
            self.window.generate_output()

        current_total = self.window.total_edit.text()
        current_flow = self.window.flow_edit.text()
        current_big_ship = self.window.big_ship_edit.text()

        self.window.output_text.setPlainText("我手工改了结果")

        self.assertEqual(self.window.total_edit.text(), current_total)
        self.assertEqual(self.window.flow_edit.text(), current_flow)
        self.assertEqual(self.window.big_ship_edit.text(), current_big_ship)

    def test_generate_requires_saved_flow_even_if_raw_text_contains_flow(self) -> None:
        self.window.flow_edit.clear()
        self.window.raw_input.setPlainText("船号:福顺855\n报装4600吨\n流向:高栏到都骑\n船期:13号")

        with patch.object(QMessageBox, "warning") as warning_mock:
            self.window.generate_output()

        warning_mock.assert_called_once()
        self.assertIn("请先在当前状态中填写流向。", warning_mock.call_args.args[2])

    def test_generate_ignores_raw_flow_and_keeps_saved_flow(self) -> None:
        with patch("shipment_tool.date", FakeDate):
            self.window.raw_input.setPlainText("船号:福顺855\n报装4600吨\n流向:高栏到云浮\n船期:13号")
            self.window.generate_output()

        self.assertEqual(self.window.flow_edit.text(), "高栏—都骑")
        self.assertIn("流向：高栏—都骑", self.window.output_text.toPlainText())

    def test_generate_triggers_limit_prompt_above_threshold(self) -> None:
        self.window.total_edit.setText("79000")

        with patch("shipment_tool.date", FakeDate):
            self.window.raw_input.setPlainText("船号:福顺855\n报装2000吨\n电话13729786260\n船期:13号")
            with patch.object(self.window, "_handle_total_limit") as prompt_mock:
                self.window.generate_output()

        prompt_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main()
