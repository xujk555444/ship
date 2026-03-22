from __future__ import annotations

import sys

from PySide6.QtGui import QGuiApplication
from PySide6.QtWidgets import (
    QApplication,
    QFormLayout,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from shipment_tool import (
    ParsedShipment,
    ShipmentState,
    TONNAGE_REMINDER_THRESHOLD,
    build_output,
    complete_current_run,
    generate_shipment,
    load_state,
    save_state,
    update_state_after_generation,
)


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("报装信息生成工具")
        self.resize(980, 720)
        self.state = load_state()
        self.last_parsed: ParsedShipment | None = None
        self.last_total: int | None = None
        self._build_ui()
        self._load_state_into_form()

    def _build_ui(self) -> None:
        root = QWidget()
        self.setCentralWidget(root)
        layout = QVBoxLayout(root)
        layout.setSpacing(12)

        title = QLabel("报装信息生成工具")
        title.setStyleSheet("font-size: 22px; font-weight: 700;")
        layout.addWidget(title)

        subtitle = QLabel("本地离线运行，自动处理大船号、流向、累积和船期规则。")
        subtitle.setStyleSheet("color: #555;")
        layout.addWidget(subtitle)

        state_group = QGroupBox("当前状态")
        state_form = QFormLayout(state_group)
        self.big_ship_edit = QLineEdit()
        self.flow_edit = QLineEdit()
        self.total_edit = QLineEdit()
        self.total_edit.setPlaceholderText("数字，例如 3200")
        state_form.addRow("大船号", self.big_ship_edit)
        state_form.addRow("流向", self.flow_edit)
        state_form.addRow("当前累积(吨)", self.total_edit)

        state_buttons = QHBoxLayout()
        save_state_btn = QPushButton("保存状态")
        save_state_btn.clicked.connect(self.save_current_state)
        complete_btn = QPushButton("标记运完")
        complete_btn.clicked.connect(self.complete_run)
        state_buttons.addWidget(save_state_btn)
        state_buttons.addWidget(complete_btn)
        state_form.addRow(state_buttons)
        layout.addWidget(state_group)

        content = QGridLayout()
        content.setColumnStretch(0, 1)
        content.setColumnStretch(1, 1)

        input_group = QGroupBox("原始信息")
        input_layout = QVBoxLayout(input_group)
        self.raw_input = QTextEdit()
        self.raw_input.setPlaceholderText(
            "示例:\n海亚88\n装3200吨\n电话18777599853\n高栏一都骑\n船期:吉船已到锚地"
        )
        input_layout.addWidget(self.raw_input)

        input_buttons = QHBoxLayout()
        generate_btn = QPushButton("生成")
        generate_btn.clicked.connect(self.generate_output)
        clear_btn = QPushButton("清空输入")
        clear_btn.clicked.connect(self.raw_input.clear)
        input_buttons.addWidget(generate_btn)
        input_buttons.addWidget(clear_btn)
        input_layout.addLayout(input_buttons)
        content.addWidget(input_group, 0, 0)

        output_group = QGroupBox("生成结果")
        output_layout = QVBoxLayout(output_group)
        self.output_text = QTextEdit()
        self.output_text.setReadOnly(False)
        output_layout.addWidget(self.output_text)

        output_buttons = QHBoxLayout()
        copy_btn = QPushButton("复制结果")
        copy_btn.clicked.connect(self.copy_output)
        clear_output_btn = QPushButton("清空结果")
        clear_output_btn.clicked.connect(self.output_text.clear)
        output_buttons.addWidget(copy_btn)
        output_buttons.addWidget(clear_output_btn)
        output_layout.addLayout(output_buttons)
        content.addWidget(output_group, 0, 1)

        layout.addLayout(content)

        tips = QLabel(
            f"规则摘要：第一船累积=报装数；同一大船后续累积递增；超过{TONNAGE_REMINDER_THRESHOLD}吨会提醒确认是否运完。"
        )
        tips.setWordWrap(True)
        tips.setStyleSheet("color: #666;")
        layout.addWidget(tips)

    def _load_state_into_form(self) -> None:
        self.big_ship_edit.setText(self.state.big_ship_no)
        self.flow_edit.setText(self.state.flow)
        self.total_edit.setText(str(self.state.current_total) if self.state.current_total else "")

    def _read_state_from_form(self) -> ShipmentState:
        big_ship_no = self.big_ship_edit.text().strip()
        flow = self.flow_edit.text().strip()
        total_text = self.total_edit.text().strip()
        total = 0
        if total_text:
            try:
                total = int(total_text)
            except ValueError as exc:
                raise ValueError("当前累积必须是数字。") from exc
        return ShipmentState(big_ship_no=big_ship_no, flow=flow, current_total=total)

    def save_current_state(self) -> None:
        try:
            self.state = self._read_state_from_form()
        except ValueError as exc:
            QMessageBox.warning(self, "状态错误", str(exc))
            return

        save_state(self.state)
        QMessageBox.information(self, "已保存", "当前状态已保存到本地。")

    def complete_run(self) -> None:
        confirm = QMessageBox.question(
            self,
            "确认运完",
            "确定这条大船已经运完吗？确认后会清空大船号、流向和累积。",
        )
        if confirm != QMessageBox.StandardButton.Yes:
            return

        self.state = complete_current_run()
        self._load_state_into_form()
        QMessageBox.information(self, "已清空", "当前大船状态已清空，下一条请重新填写大船号和流向。")

    def generate_output(self) -> None:
        raw_text = self.raw_input.toPlainText().strip()
        if not raw_text:
            QMessageBox.warning(self, "缺少内容", "请先粘贴原始报装信息。")
            return

        try:
            self.state = self._read_state_from_form()
            parsed, output, new_total = generate_shipment(raw_text, self.state)
        except ValueError as exc:
            QMessageBox.warning(self, "生成失败", str(exc))
            return

        self.output_text.setPlainText(output)
        self.last_parsed = parsed
        self.last_total = new_total

        self.state = update_state_after_generation(self.state, parsed, new_total)
        self.total_edit.setText(str(new_total))
        save_state(self.state)

        if new_total > TONNAGE_REMINDER_THRESHOLD:
            self._handle_total_limit()

    def _handle_total_limit(self) -> None:
        answer = QMessageBox.question(
            self,
            f"累积已超过{TONNAGE_REMINDER_THRESHOLD}吨",
            f"当前累积已超过{TONNAGE_REMINDER_THRESHOLD}吨，这条大船是否运完？",
        )
        if answer == QMessageBox.StandardButton.Yes:
            self.state = complete_current_run()
            self._load_state_into_form()
            QMessageBox.information(self, "已运完", "已清空当前大船状态，下一条请重新填写大船号和流向。")

    def copy_output(self) -> None:
        text = self.output_text.toPlainText()
        if not text:
            return

        try:
            QGuiApplication.clipboard().setText(text)
        except Exception as exc:  # pragma: no cover - defensive UI guard
            QMessageBox.warning(self, "复制失败", str(exc))


def main() -> int:
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    window = MainWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
